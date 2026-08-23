// Shared logic for evaluating a submitted (or candidate reference) SQL
// query against a problem's schema/sample data using real MySQL TEMPORARY
// tables. Used by both the live evaluate route (server.js) and the offline
// problem-testing harness (scripts/test-problem.js) so both run against
// byte-for-byte identical grading logic.

const stripSqlComments = (sql) => {
  let result = sql.replace(/\/\*[\s\S]*?\*\//g, "");
  result = result.replace(/--.*$/gm, "");
  result = result.replace(/#.*$/gm, "");
  return result;
};

const splitStatements = (sql) =>
  sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s);

// Problems were authored for this app's old SQLite-based evaluation sandbox
// (see problems/*.json), so their schemas contain a couple of SQLite-isms
// that aren't valid MySQL:
//  - AUTOINCREMENT (no underscore) -> AUTO_INCREMENT
//  - INTEGER -> BIGINT: SQLite's INTEGER is effectively 64-bit with no
//    range enforcement, while MySQL's INT is 32-bit and does enforce it -
//    some existing problems use values (e.g. GDP figures) that overflow INT.
const normalizeSchemaForMysql = (schema) =>
  schema
    .replace(/\bAUTOINCREMENT\b/gi, "AUTO_INCREMENT")
    .replace(/\bINTEGER\b/gi, "BIGINT");

// Run problem schemas as TEMPORARY tables so they're scoped to the eval
// connection and never collide with real tables the eval user can't see.
const toTemporaryCreateTable = (stmt) =>
  stmt.replace(/^\s*CREATE\s+TABLE\b/i, "CREATE TEMPORARY TABLE");

// Runs `query` (already comment-stripped, semicolon-split into statements)
// against one test case of `problem`, using a fresh connection from
// `evalPool`. Returns the last statement's result rows, matching what the
// grading endpoint compares against `expectedOutput`.
//
// The connection is always destroyed afterward rather than released back to
// the pool. A submitted query is free to create its own temporary tables or
// session variables (both legitimate techniques, e.g. a helper temp table
// for a DML problem) - those live for the lifetime of the connection, not
// just the tables named in the problem's schema, so name-based cleanup
// can't reliably catch them. Destroying the connection is the only way to
// guarantee nothing a student's query does can leak into whichever
// unrelated request the pool would otherwise have handed that connection
// to next.
const runQueryAgainstTestCase = async (evalPool, problem, testCase, userStatements) => {
  const schema = normalizeSchemaForMysql(problem.schema);
  const createStatements = splitStatements(schema).map(toTemporaryCreateTable);

  const conn = await evalPool.getConnection();
  try {
    await conn.query("SET SESSION max_statement_time = 5");

    for (const stmt of createStatements) {
      await conn.query(stmt);
    }
    for (const stmt of splitStatements(testCase.sampleData)) {
      await conn.query(stmt);
    }

    let lastResult;
    for (const stmt of userStatements) {
      const [rows] = await conn.query(stmt);
      lastResult = rows;
    }
    return lastResult;
  } finally {
    conn.destroy();
  }
};

module.exports = {
  stripSqlComments,
  splitStatements,
  normalizeSchemaForMysql,
  toTemporaryCreateTable,
  runQueryAgainstTestCase,
};
