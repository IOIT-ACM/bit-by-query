const express = require("express");
const bodyParser = require("body-parser");
const mysql = require("mysql2/promise"); // Use mysql2 for async/await support
const fs = require("fs");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = 5000;

const JWT_SECRET = process.env.JWT_SECRET || "jwt_secret";

// Middleware
app.use(bodyParser.json());

// Serve the Vite build (client/dist)
app.use(express.static(path.join(__dirname, "client/dist")));

const problemsDirectory = path.join(__dirname, "problems");
const problemsFile = path.join(problemsDirectory, "aug2026.json");

let problems = [];

// Check if the file exists and load the problems
if (fs.existsSync(problemsFile)) {
  problems = JSON.parse(fs.readFileSync(problemsFile, "utf-8"));
} else {
  console.error("Problems file not found.");
}

// Middleware to handle errors
const handleErrors = (err, req, res, next) => {
  console.error(err.stack);
  res
    .status(500)
    .json({ error: "Internal Server Error", details: err.message });
};

// Middleware to verify JWT
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Access token required" });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
    req.user = user;
    next();
  });
};

// MySQL Connection Pool
// `timezone: "Z"` makes mysql2 treat DATETIME/TIMESTAMP values as UTC when
// converting to/from JS Date objects. TIMESTAMP columns also get converted
// by the *server* using the session's `time_zone`, so the session variable
// below is set to UTC too - otherwise MySQL silently re-interprets already-
// UTC values using the host machine's local offset (e.g. IST), corrupting
// the competition start/end times by that offset.
const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 200, // Maximum number of connections in the pool
  queueLimit: 0, // Unlimited queue length
  timezone: "Z",
});

pool.on("connection", (connection) => {
  connection.query("SET time_zone='+00:00'");
});

// Created here (rather than relying solely on schema.sql) so upgrading an
// already-set-up database doesn't require a manual migration step.
pool
  .execute(
    `CREATE TABLE IF NOT EXISTS event_logs (
      id INT NOT NULL AUTO_INCREMENT,
      type ENUM('auth', 'admin', 'error') NOT NULL,
      level ENUM('info', 'warn', 'error') NOT NULL DEFAULT 'info',
      message TEXT NOT NULL,
      username VARCHAR(255) DEFAULT NULL,
      ip_address VARCHAR(64) DEFAULT NULL,
      metadata TEXT DEFAULT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      KEY idx_event_logs_type_created (type, created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`,
  )
  .catch((err) => console.error("Failed to ensure event_logs table exists:", err));

// Records an entry for the admin panel's live event log. Never throws -
// logging a failure must not break the request that triggered it.
const logEvent = async ({ type, level = "info", message, username = null, req = null, metadata = null }) => {
  try {
    await pool.execute(
      "INSERT INTO event_logs (type, level, message, username, ip_address, metadata) VALUES (?, ?, ?, ?, ?, ?)",
      [type, level, message, username, req ? req.ip : null, metadata ? JSON.stringify(metadata) : null],
    );
  } catch (err) {
    console.error("Failed to write event log:", err.message);
  }
};

// Shared admin-only route guard: confirms the authenticated user exists
// and has a row in `admins`.
const requireAdmin = async (req, res, next) => {
  try {
    const [rows] = await pool.execute("SELECT id FROM users WHERE username = ?", [req.user.username]);
    if (rows.length === 0) return res.status(403).json({ error: "Unauthorized" });

    const [admins] = await pool.execute("SELECT id FROM admins WHERE user_id = ?", [rows[0].id]);
    if (admins.length === 0) return res.status(403).json({ error: "Unauthorized" });

    next();
  } catch (err) {
    console.error("Error checking admin status:", err);
    res.status(500).json({ error: "Internal server error" });
  }
};

// Separate pool for executing untrusted, competitor-submitted SQL during
// evaluation. Uses a dedicated, minimally-privileged DB user (see
// db/setup_eval_user.sql) that can only create/use TEMPORARY tables on
// `bbq` - it has no SELECT/INSERT/UPDATE/DELETE/DROP on the real tables
// (users, submissions, config) and no access to any other database. This
// keeps a malicious or buggy submitted query from reaching anything real,
// even though it now runs against a live MySQL connection instead of a
// disposable in-memory SQLite database.
const evalPool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_EVAL_USER,
  password: process.env.DB_EVAL_PASSWORD,
  database: process.env.DB_NAME,
  waitForConnections: true,
  connectionLimit: 50,
  queueLimit: 0,
  timezone: "Z",
  dateStrings: true, // return DATE/DATETIME/TIMESTAMP as plain strings, not JS Date objects
});

// Middleware to attach pool to req object
app.use((req, res, next) => {
  req.db = pool;
  next();
});

// Route: User login
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res
      .status(400)
      .json({ error: "Username and password are required" });
  }

  try {
    // Fetch user from MySQL database
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE username = ?",
      [username],
    );

    if (rows.length === 0) {
      logEvent({ type: "auth", level: "warn", message: "Login failed: user not found", username, req });
      return res.status(400).json({ error: "User not found" });
    }

    const user = rows[0];

    // Compare the password with the stored hash
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);

    if (!isPasswordValid) {
      logEvent({ type: "auth", level: "warn", message: "Login failed: invalid password", username, req });
      return res.status(400).json({ error: "Invalid password" });
    }

    // Generate JWT token
    const token = jwt.sign({ username: user.username }, JWT_SECRET, {
      expiresIn: "3h",
    });

    logEvent({ type: "auth", level: "info", message: "Login succeeded", username, req });
    res.json({ token });
  } catch (err) {
    console.error("Error during login:", err);
    logEvent({ type: "error", level: "error", message: `Login error: ${err.message}`, username, req });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route: User Registration
app.post("/api/register", async (req, res) => {
  const { username, password, name } = req.body;

  if (!username || !password || !name) {
    return res
      .status(400)
      .json({ error: "Username, password, and name are required" });
  }

  try {
    // Check if the user already exists
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE username = ?",
      [username],
    );

    if (rows.length > 0) {
      logEvent({ type: "auth", level: "warn", message: "Registration failed: username taken", username, req });
      return res.status(400).json({ error: "Username is already taken" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert the new user into the database
    await pool.execute(
      "INSERT INTO users (username, password_hash, name) VALUES (?, ?, ?)",
      [username, hashedPassword, name],
    );

    logEvent({ type: "auth", level: "info", message: "User registered", username, req, metadata: { name } });
    res.status(201).json({ message: "User registered successfully" });
  } catch (err) {
    console.error("Error during registration:", err);
    logEvent({ type: "error", level: "error", message: `Registration error: ${err.message}`, username, req });
    res.status(500).json({ error: "Internal server error" });
  }
});

app.get("/api/userinfo", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM users WHERE username = ?",
      [req.user.username],
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: "User not found" });
    }

    const user = rows[0];
    // Exclude the password hash for security
    const { password_hash, ...userInfo } = user;

    const [admins] = await pool.execute(
      "SELECT * FROM admins WHERE user_id = ?",
      [user.id],
    );

    res.json({ ...userInfo, isAdmin: admins.length > 0 });
  } catch (err) {
    console.error("Error fetching user info:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});
app.get("/api/get-time", async (req, res) => {
  try {
    const [config] = await pool.execute("SELECT * FROM config");
    if (config.length === 0) {
      return res.status(500).json({ error: "The config table is empty." });
    }
    res.json({
      start_time: config[0].start_time,
      end_time: config[0].end_time,
    });
  } catch (err) {
    console.error("Error while trying to get time: ", err);
    res.status(500).json({ error: "Internal Server error" });
  }
});
// Config times are stored as UTC; normalize any incoming ISO string to
// MySQL's 'YYYY-MM-DD HH:MM:SS' literal format so it isn't reinterpreted
// using the DB connection's timezone.
const toMysqlUtcTimestamp = (isoString) => {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 19).replace("T", " ");
};

app.post("/api/update-time", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { start_time, end_time } = req.body;
    if (!start_time && !end_time)
      return res.status(400).json({ error: "Bad Request" });

    const startValue = start_time ? toMysqlUtcTimestamp(start_time) : null;
    const endValue = end_time ? toMysqlUtcTimestamp(end_time) : null;
    if ((start_time && !startValue) || (end_time && !endValue)) {
      return res.status(400).json({ error: "Invalid date value" });
    }

    const [existing] = await pool.execute("SELECT id FROM config LIMIT 1");

    if (existing.length === 0) {
      if (!startValue || !endValue) {
        return res.status(400).json({
          error: "No config row exists yet; provide both start_time and end_time to create one.",
        });
      }
      await pool.execute(
        "INSERT INTO config (start_time, end_time) VALUES (?, ?)",
        [startValue, endValue],
      );
      logEvent({
        type: "admin",
        message: "Created competition schedule",
        username: req.user.username,
        req,
        metadata: { start_time: startValue, end_time: endValue },
      });
      return res.json({ message: "Created config." });
    }

    let update_list = [];
    if (startValue) update_list.push(startValue);
    if (endValue) update_list.push(endValue);

    await pool.execute(
      `UPDATE config set ${startValue ? "start_time = ?" : ""}${startValue && endValue ? ", " : ""}${endValue ? "end_time = ?" : ""}`,
      update_list,
    );
    logEvent({
      type: "admin",
      message: "Updated competition schedule",
      username: req.user.username,
      req,
      metadata: { start_time: startValue, end_time: endValue },
    });
    res.json({ message: "Updated config." });
  } catch (err) {
    console.error("Error while trying to update time: ", err);
    logEvent({
      type: "error",
      level: "error",
      message: `update-time error: ${err.message}`,
      username: req.user.username,
      req,
    });
    res.status(500).json({ error: "Internal server error" });
  }
});

// Route: Fetch all problems (protected)
app.get("/api/problems", authenticateToken, (req, res) => {
  if (problems.length === 0) {
    return res.status(404).json({ error: "No problems available" });
  }
  res.json(problems);
});

app.get("/api/submissions", authenticateToken, async (req, res) => {
  try {
    const [rows] = await pool.execute(
      "SELECT * FROM submissions WHERE username = ?",
      [req.user.username],
    );

    res.json(rows);
  } catch (err) {
    console.error("Error fetching submissions:", err.message);
    res.status(500).json({
      error: "Failed to fetch submissions",
      details: err.message,
    });
  }
});

// Route: Fetch a specific problem by ID (protected)
app.get("/api/problems/:id", authenticateToken, (req, res) => {
  const problemId = req.params.id;
  const problem = problems.find((p) => p.id == problemId);

  if (!problem) {
    return res.status(404).json({ error: "Problem not found" });
  }
  res.json(problem);
});

// Helper function to strip SQL comments
const stripSqlComments = (sql) => {
  // Remove multi-line comments /* ... */
  let result = sql.replace(/\/\*[\s\S]*?\*\//g, "");
  // Remove single-line comments -- ... (until end of line)
  result = result.replace(/--.*$/gm, "");
  // Remove single-line comments # ... (MySQL style, until end of line)
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

const extractTableNames = (schema) => {
  const names = [];
  const re = /CREATE TABLE\s+`?(\w+)`?/gi;
  let m;
  while ((m = re.exec(schema))) names.push(m[1]);
  return names;
};

app.post("/api/problems/:id/evaluate", authenticateToken, async (req, res) => {
  const problemId = req.params.id;
  const { userQuery } = req.body;

  if (!userQuery) {
    return res.status(400).json({ error: "User query is required" });
  }

  const problem = problems.find((p) => p.id == problemId);
  if (!problem) {
    return res.status(404).json({ error: "Problem not found" });
  }

  const start = Date.now();
  let allTestCasesPassed = true;
  const testResults = [];

  const userStatements = splitStatements(stripSqlComments(userQuery));
  if (userStatements.length === 0) {
    return res.status(400).json({ error: "User query is required" });
  }

  const schema = normalizeSchemaForMysql(problem.schema);
  const tableNames = extractTableNames(schema);
  const createStatements = splitStatements(schema).map(toTemporaryCreateTable);

  // Run each test case
  for (let i = 0; i < problem.testCases.length; i++) {
    const testCase = problem.testCases[i];
    const conn = await evalPool.getConnection();

    try {
      // Hard cap on how long any single statement in this test case may
      // run, so one pathological submission can't tie up an eval
      // connection indefinitely while up to ~100 people are submitting.
      await conn.query("SET SESSION max_statement_time = 5");

      for (const stmt of createStatements) {
        await conn.query(stmt);
      }
      for (const stmt of splitStatements(testCase.sampleData)) {
        await conn.query(stmt);
      }

      // Execute user statements; only the last one's result is graded
      // (mirrors the previous SQLite-based behavior).
      let lastResult;
      for (const stmt of userStatements) {
        const [rows] = await conn.query(stmt);
        lastResult = rows;
      }

      const isCorrect =
        JSON.stringify(lastResult) === JSON.stringify(testCase.expectedOutput);
      if (!isCorrect) allTestCasesPassed = false;

      testResults.push({
        testCaseNumber: i + 1,
        passed: isCorrect,
        userOutput: lastResult,
        expectedOutput: testCase.expectedOutput,
      });
    } catch (err) {
      testResults.push({
        testCaseNumber: i + 1,
        passed: false,
        error: err.message,
      });
      allTestCasesPassed = false;
    } finally {
      // Always leave the pooled connection clean before it's reused by an
      // unrelated evaluate call - otherwise a leftover temp table could
      // collide with (or shadow) one a future request tries to create.
      for (const name of tableNames) {
        try {
          await conn.query(`DROP TEMPORARY TABLE IF EXISTS \`${name}\``);
        } catch (dropErr) {
          console.error("Error dropping temp table:", dropErr.message);
        }
      }
      conn.release();
    }
  }

  const duration = Date.now() - start;

  // Handle submission if all test cases passed
  if (allTestCasesPassed) {
    try {
      const [existingSubmission] = await pool.execute(
        "SELECT * FROM submissions WHERE username = ? AND problem_id = ?",
        [req.user.username, problemId],
      );

      if (existingSubmission.length > 0) {
        return res.status(400).json({
          error: "Duplicate submission",
          details: "You have already solved this problem",
        });
      }

      const [userRows] = await pool.execute(
        "SELECT name FROM users WHERE username = ?",
        [req.user.username],
      );

      if (userRows.length === 0) {
        return res.status(404).json({ error: "User not found" });
      }

      const userName = userRows[0].name;

      await pool.execute(
        "INSERT INTO submissions (username, name, problem_id, marks, timestamp) VALUES (?, ?, ?, ?, UNIX_TIMESTAMP())",
        [req.user.username, userName, problemId, problem.marks],
      );
    } catch (dbErr) {
      console.error("Error saving submission:", dbErr.message);
      logEvent({
        type: "error",
        level: "error",
        message: `Failed to save submission: ${dbErr.message}`,
        username: req.user.username,
        req,
        metadata: { problemId },
      });
      return res.status(500).json({
        error: "Failed to save submission",
        details: dbErr.message,
      });
    }
  }

  res.json({
    correct: allTestCasesPassed,
    testResults,
    duration: `${duration}ms`,
  });
});

app.get("/api/leaderboard", async (req, res) => {
  try {
    // Query to find the leaderboard including total marks
    const query = `
      SELECT 
        username,
        name,
        COUNT(DISTINCT problem_id) AS problems_solved, 
        SUM(marks) AS score,
        MAX(timestamp) AS last_submission
      FROM 
        submissions
      GROUP BY 
        username, name
      ORDER BY 
        score DESC,
        last_submission ASC;`;

    const [rows] = await pool.execute(query);

    // Directly return the rows array
    res.json(rows);
  } catch (err) {
    console.error("Error fetching leaderboard:", err.message);
    res.status(500).json({
      error: "Failed to fetch leaderboard",
      details: err.message,
    });
  }
});

const LOG_TYPES = ["auth", "admin", "error"];

app.get("/api/admin/logs", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const { type } = req.query;

    let sql = "SELECT id, type, level, message, username, ip_address, metadata, created_at FROM event_logs";
    const params = [];
    if (type) {
      if (!LOG_TYPES.includes(type)) {
        return res.status(400).json({ error: `type must be one of: ${LOG_TYPES.join(", ")}` });
      }
      sql += " WHERE type = ?";
      params.push(type);
    }
    // LIMIT as a bound param is unreliable across mysql2/MySQL versions with
    // prepared statements; `limit` is clamped to a safe integer above.
    sql += ` ORDER BY id DESC LIMIT ${limit}`;

    const [rows] = await pool.execute(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("Error fetching event logs:", err.message);
    res.status(500).json({ error: "Failed to fetch event logs", details: err.message });
  }
});

app.get("/api/admin/submissions", authenticateToken, requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 500);
    const [rows] = await pool.execute(
      `SELECT id, username, name, problem_id, marks, timestamp FROM submissions ORDER BY id DESC LIMIT ${limit}`,
    );
    const withTitles = rows.map((r) => ({
      ...r,
      problemTitle: problems.find((p) => p.id === r.problem_id)?.title ?? `#${r.problem_id}`,
    }));
    res.json(withTitles);
  } catch (err) {
    console.error("Error fetching admin submissions:", err.message);
    res.status(500).json({ error: "Failed to fetch submissions", details: err.message });
  }
});

// Fallback to serve `index.html` for non-API routes
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "client/dist/index.html"));
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// Error handling middleware
app.use(handleErrors);

// Start server
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});

// Gracefully close the pool on app termination
process.on("SIGINT", async () => {
  try {
    await pool.end();
    // console.log("MySQL connection pool closed.");
    process.exit(0);
  } catch (err) {
    // console.error("Error closing MySQL connection pool:", err.message);
    process.exit(1);
  }
});
