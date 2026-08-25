#!/usr/bin/env node
// Tests a candidate SQL query against one problem's schema + every test
// case, using the exact same grading logic (lib/grading.js) the live
// evaluate route uses - so a PASS here means it would really pass during
// the event.
//
// Usage:
//   node scripts/test-problem.js <problemId> "<SQL query>"
//   node scripts/test-problem.js <problemId> --file path/to/query.sql
//   node scripts/test-problem.js <problemId> "<SQL query>" --problems problems/jan2026.json
//
// Exits 0 if every test case passes, 1 otherwise (or on error).

require("dotenv").config();
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const { stripSqlComments, splitStatements, runQueryAgainstTestCase } = require("../lib/grading");

const args = process.argv.slice(2);
const fileFlagIndex = args.indexOf("--file");
const problemsFlagIndex = args.indexOf("--problems");

if (args.length < 1 || (fileFlagIndex === -1 && args.length < 2)) {
  console.error('Usage: node scripts/test-problem.js <problemId> "<SQL query>" [--problems path]');
  console.error("       node scripts/test-problem.js <problemId> --file query.sql [--problems path]");
  process.exit(1);
}

const problemId = Number(args[0]);
const problemsPath =
  problemsFlagIndex !== -1 ? args[problemsFlagIndex + 1] : path.join(__dirname, "..", "problems", "aug2026.json");

let query;
if (fileFlagIndex !== -1) {
  query = fs.readFileSync(args[fileFlagIndex + 1], "utf-8");
} else {
  query = args[1];
}

(async () => {
  const problems = JSON.parse(fs.readFileSync(problemsPath, "utf-8"));
  const problem = problems.find((p) => p.id === problemId);
  if (!problem) {
    console.error(`Problem ${problemId} not found in ${problemsPath}`);
    process.exit(1);
  }

  const userStatements = splitStatements(stripSqlComments(query));
  if (userStatements.length === 0) {
    console.error("Query is empty after stripping comments.");
    process.exit(1);
  }

  const evalPool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_EVAL_USER,
    password: process.env.DB_EVAL_PASSWORD,
    database: process.env.DB_NAME,
    timezone: "Z",
    dateStrings: true,
    decimalNumbers: true,
  });

  console.log(`Problem ${problem.id}: ${problem.title}`);
  console.log(problem.description);
  console.log();

  let allPassed = true;
  for (let i = 0; i < problem.testCases.length; i++) {
    const testCase = problem.testCases[i];
    try {
      const actual = await runQueryAgainstTestCase(evalPool, problem, testCase, userStatements);
      const actualStr = JSON.stringify(actual);
      const expectedStr = JSON.stringify(testCase.expectedOutput);
      const passed = actualStr === expectedStr;
      allPassed = allPassed && passed;

      console.log(`Test case ${i + 1}: ${passed ? "PASS" : "FAIL"}`);
      if (!passed) {
        console.log(`  actual  : ${actualStr}`);
        console.log(`  expected: ${expectedStr}`);
      }
    } catch (err) {
      allPassed = false;
      console.log(`Test case ${i + 1}: ERROR - ${err.message}`);
    }
  }

  await evalPool.end();
  console.log();
  console.log(allPassed ? "ALL TEST CASES PASSED" : "SOME TEST CASES FAILED");
  process.exit(allPassed ? 0 : 1);
})().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
