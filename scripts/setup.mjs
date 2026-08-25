#!/usr/bin/env node
// Fresh-machine setup for Bit By Query.
//
// Checks for required system dependencies (Node.js, a package manager,
// MySQL/MariaDB) and tells you what to install if something's missing,
// then creates the database/users, writes .env files, installs npm
// dependencies, and builds the client.
//
// Safe to re-run: it detects existing setup and asks before overwriting
// or destroying anything (an existing .env, existing DB tables, etc).
//
// Deliberately depends on nothing beyond Node's standard library, since
// its whole job is to get a machine from "nothing installed" to "ready" -
// it can't assume npm/bun dependencies are already there.

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import crypto from "node:crypto";
import readline from "node:readline/promises";
import { fileURLToPath } from "node:url";

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

// ---------- small utilities ----------

const color = (code, s) => `\x1b[${code}m${s}\x1b[0m`;
const bold = (s) => color(1, s);
const green = (s) => color(32, s);
const yellow = (s) => color(33, s);
const red = (s) => color(31, s);
const cyan = (s) => color(36, s);

const step = (n, total, msg) => console.log(`\n${cyan(`[${n}/${total}]`)} ${bold(msg)}`);
const ok = (msg) => console.log(`  ${green("✓")} ${msg}`);
const info = (msg) => console.log(`  ${msg}`);
const warn = (msg) => console.log(`  ${yellow("!")} ${msg}`);
const fail = (msg) => console.log(`  ${red("✗")} ${msg}`);

const commandExists = (cmd) => {
  const which = os.platform() === "win32" ? "where" : "which";
  return spawnSync(which, [cmd], { stdio: "ignore" }).status === 0;
};

const run = (cmd, args, opts = {}) =>
  spawnSync(cmd, args, { encoding: "utf-8", ...opts });

const genSecret = (bytes = 24) => crypto.randomBytes(bytes).toString("hex");

const ask = async (question, def) => {
  const suffix = def !== undefined ? ` [${def}]` : "";
  const answer = (await rl.question(`  ${question}${suffix}: `)).trim();
  return answer || def;
};

const askYesNo = async (question, def = true) => {
  const suffix = def ? "[Y/n]" : "[y/N]";
  const answer = (await rl.question(`  ${question} ${suffix}: `)).trim().toLowerCase();
  if (!answer) return def;
  return answer.startsWith("y");
};

// Basic masked password prompt (readline has no built-in support for this).
// Processes input character-by-character rather than assuming one keystroke
// per "data" event, since piped/non-TTY input can deliver a whole answer
// (including its trailing newline) as a single chunk.
const CTRL_C = "\u0003";
const BACKSPACE = "\u007f";
const askHidden = (question) =>
  new Promise((resolve) => {
    process.stdout.write(`  ${question}: `);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    let value = "";
    let finished = false;
    if (stdin.isTTY) stdin.setRawMode(true);
    stdin.resume();
    stdin.setEncoding("utf-8");
    const finish = () => {
      finished = true;
      stdin.removeListener("data", onData);
      if (stdin.isTTY) stdin.setRawMode(wasRaw);
      stdin.pause();
      process.stdout.write("\n");
      resolve(value);
    };
    const onData = (chunk) => {
      for (const ch of chunk.toString()) {
        if (finished) return;
        if (ch === "\n" || ch === "\r") {
          finish();
          return;
        } else if (ch === CTRL_C) {
          process.exit(130);
        } else if (ch === BACKSPACE || ch === "\b") {
          value = value.slice(0, -1);
        } else {
          value += ch;
        }
      }
    };
    stdin.on("data", onData);
  });

const VALID_IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;
const validIdentOrRetry = async (question, def) => {
  for (;;) {
    const v = await ask(question, def);
    if (VALID_IDENT.test(v)) return v;
    warn("Please use only letters, numbers and underscores.");
  }
};

// ---------- dependency detection ----------

const PKG_MANAGERS = ["apt-get", "apt", "dnf", "yum", "pacman", "zypper", "brew"];
const detectSystemPkgManager = () => PKG_MANAGERS.find(commandExists) ?? null;

const INSTALL_HINTS = {
  node: {
    "apt-get": "sudo apt-get install -y nodejs npm",
    apt: "sudo apt install -y nodejs npm",
    dnf: "sudo dnf install -y nodejs npm",
    yum: "sudo yum install -y nodejs npm",
    pacman: "sudo pacman -S --noconfirm nodejs npm",
    zypper: "sudo zypper install -y nodejs npm",
    brew: "brew install node",
    fallback: "Download an installer from https://nodejs.org/en/download",
  },
  mysql: {
    "apt-get": "sudo apt-get install -y mariadb-server mariadb-client",
    apt: "sudo apt install -y mariadb-server mariadb-client",
    dnf: "sudo dnf install -y mariadb-server mariadb",
    yum: "sudo yum install -y mariadb-server mariadb",
    pacman: "sudo pacman -S --noconfirm mariadb",
    zypper: "sudo zypper install -y mariadb",
    brew: "brew install mariadb",
    fallback: "See https://mariadb.org/download/ or https://dev.mysql.com/downloads/",
  },
  bun: {
    fallback: "curl -fsSL https://bun.sh/install | bash   (or just use npm, which ships with Node.js)",
  },
  buildTools: {
    "apt-get": "sudo apt-get install -y build-essential python3",
    apt: "sudo apt install -y build-essential python3",
    dnf: "sudo dnf groupinstall -y 'Development Tools' && sudo dnf install -y python3",
    yum: "sudo yum groupinstall -y 'Development Tools' && sudo yum install -y python3",
    pacman: "sudo pacman -S --noconfirm base-devel python",
    zypper: "sudo zypper install -y -t pattern devel_basis && sudo zypper install -y python3",
    brew: "xcode-select --install",
    fallback: "Install a C/C++ compiler (gcc/clang) and python3 for your platform.",
  },
};

const printInstallHint = (what) => {
  const pm = detectSystemPkgManager();
  const hints = INSTALL_HINTS[what];
  const hint = (pm && hints[pm]) || hints.fallback;
  fail(`${what} not found. Install it with:`);
  console.log(`      ${bold(hint)}`);
};

const START_SERVICE_HINTS = () => {
  if (os.platform() === "darwin") {
    return ["brew services start mariadb", "# or: mysql.server start"];
  }
  if (commandExists("systemctl")) {
    return [
      "sudo systemctl start mariadb   # or: sudo systemctl start mysql",
      "sudo systemctl enable mariadb  # so it starts on boot",
    ];
  }
  return ["Start your MySQL/MariaDB server using your OS's normal method."];
};

// ---------- MySQL admin access ----------

let adminMethod = null; // "direct" | "sudo" | { user, password, host }

const mysqlBinary = () => (commandExists("mariadb") ? "mariadb" : "mysql");

const runAdminSql = (sql) => {
  const bin = mysqlBinary();
  if (adminMethod === "direct") return run(bin, [], { input: sql });
  if (adminMethod === "sudo") return run("sudo", ["-n", bin], { input: sql });
  if (adminMethod && adminMethod.user) {
    const args = ["-u", adminMethod.user];
    if (adminMethod.host) args.push("-h", adminMethod.host);
    return run(bin, args, { input: sql, env: { ...process.env, MYSQL_PWD: adminMethod.password } });
  }
  throw new Error("No MySQL admin access method configured");
};

const ensureAdminAccess = async () => {
  if (typeof process.getuid === "function" && process.getuid() === 0) {
    adminMethod = "direct";
    return true;
  }
  if (commandExists("sudo") && run("sudo", ["-n", "true"]).status === 0) {
    adminMethod = "sudo";
    return true;
  }
  if (commandExists("sudo")) {
    info("Creating the database and users needs admin MySQL access, via sudo.");
    const res = run("sudo", ["-v"], { stdio: "inherit" });
    if (res.status === 0) {
      adminMethod = "sudo";
      return true;
    }
    warn("Could not get sudo access.");
  }
  info("Falling back to connecting as a MySQL admin user directly.");
  const user = await ask("MySQL admin username", "root");
  const password = await askHidden(`Password for ${user}`);
  adminMethod = { user, password };
  const test = runAdminSql("SELECT 1;");
  if (test.status !== 0) {
    fail("Could not authenticate with those credentials:");
    console.log(`      ${test.stderr?.trim()}`);
    return false;
  }
  return true;
};

// ---------- .env handling ----------

const parseEnvFile = (filePath) => {
  if (!fs.existsSync(filePath)) return {};
  const out = {};
  for (const line of fs.readFileSync(filePath, "utf-8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (m) out[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
  return out;
};

const writeEnvFile = (filePath, values, existing) => {
  const merged = { ...values, ...existing }; // never clobber values already set
  const lines = Object.entries(merged).map(([k, v]) => `${k}="${v}"`);
  fs.writeFileSync(filePath, lines.join("\n") + "\n");
  return merged;
};

// ---------- main ----------

const TOTAL_STEPS = 8;

async function main() {
  console.log(bold("\nBit By Query — machine setup\n"));

  // [1] Node.js
  step(1, TOTAL_STEPS, "Checking Node.js");
  const nodeMajor = Number(process.versions.node.split(".")[0]);
  if (nodeMajor < 18) {
    fail(`Node.js ${process.version} is too old (need >= 18).`);
    printInstallHint("node");
    process.exit(1);
  }
  ok(`Node.js ${process.version}`);

  // [2] package manager
  step(2, TOTAL_STEPS, "Checking package manager");
  let pkgManager = commandExists("bun") ? "bun" : commandExists("npm") ? "npm" : null;
  if (!pkgManager) {
    fail("Neither bun nor npm found.");
    printInstallHint("bun");
    process.exit(1);
  }
  ok(`Using ${pkgManager}`);

  // [3] MySQL/MariaDB client + server
  step(3, TOTAL_STEPS, "Checking MySQL/MariaDB");
  if (!commandExists("mysql") && !commandExists("mariadb")) {
    printInstallHint("mysql");
    process.exit(1);
  }
  const bin = mysqlBinary();
  ok(`Found client (${bin})`);

  const ping = run(bin, ["-h", "127.0.0.1", "-u", "__setup_probe__", "-e", "SELECT 1"], {
    timeout: 5000,
  });
  const stderrText = ping.stderr ?? "";
  if (/can't connect|connection refused|no such file/i.test(stderrText)) {
    fail("MySQL/MariaDB doesn't appear to be running.");
    info("Start it with:");
    for (const line of START_SERVICE_HINTS()) console.log(`      ${bold(line)}`);
    process.exit(1);
  }
  ok("Server is running");

  // [4] .env / credentials
  step(4, TOTAL_STEPS, "Database credentials");
  const envPath = path.join(ROOT, ".env");
  const existingEnv = parseEnvFile(envPath);
  const haveExistingEnv = Object.keys(existingEnv).length > 0;

  let dbHost, dbName, dbUser, dbPassword, evalUser, evalPassword, jwtSecret;
  let skipDbSetup = false;

  if (haveExistingEnv) {
    ok(`Found existing .env`);
    const reuse = await askYesNo("Reuse it and only fill in anything missing?", true);
    if (reuse) {
      dbHost = existingEnv.DB_HOST ?? "localhost";
      dbName = existingEnv.DB_NAME ?? "bbq";
      dbUser = existingEnv.DB_USER;
      dbPassword = existingEnv.DB_PASSWORD;
      evalUser = existingEnv.DB_EVAL_USER;
      evalPassword = existingEnv.DB_EVAL_PASSWORD;
      jwtSecret = existingEnv.JWT_SECRET;
      skipDbSetup = Boolean(dbUser && dbPassword && evalUser && evalPassword);
      if (skipDbSetup) {
        info("Existing app + eval DB credentials found — will verify them rather than recreating.");
      }
    }
  }

  dbHost = dbHost ?? (await ask("DB host", "localhost"));
  dbName = dbName ?? (await validIdentOrRetry("DB name", "bbq"));
  dbUser = dbUser ?? (await validIdentOrRetry("App DB username", "bbq_app"));
  dbPassword = dbPassword ?? genSecret();
  evalUser = evalUser ?? (await validIdentOrRetry("Eval sandbox DB username", "bbq_eval"));
  evalPassword = evalPassword ?? genSecret();
  jwtSecret = jwtSecret ?? genSecret(48);

  // [5] create database/users (unless we're reusing a fully-configured .env)
  step(5, TOTAL_STEPS, "Setting up the database");
  if (skipDbSetup) {
    const verify = run(bin, ["-u", dbUser, "-h", dbHost, dbName, "-e", "SELECT 1"], {
      env: { ...process.env, MYSQL_PWD: dbPassword },
    });
    if (verify.status === 0) {
      ok(`Existing app DB user "${dbUser}" works — skipping database setup.`);
    } else {
      warn(`Existing credentials for "${dbUser}" didn't work, setting the database up again.`);
      skipDbSetup = false;
    }
  }

  if (!skipDbSetup) {
    if (!(await ensureAdminAccess())) {
      fail("Couldn't get MySQL admin access — can't set up the database.");
      process.exit(1);
    }

    const harden = await askYesNo(
      "Also remove MySQL's default `test` database and anonymous users (standard hardening, recommended)?",
      true,
    );

    const setupSql = `
CREATE DATABASE IF NOT EXISTS \`${dbName}\`;
CREATE USER IF NOT EXISTS '${dbUser}'@'localhost' IDENTIFIED BY '${dbPassword}';
GRANT ALL PRIVILEGES ON \`${dbName}\`.* TO '${dbUser}'@'localhost';
CREATE USER IF NOT EXISTS '${evalUser}'@'localhost' IDENTIFIED BY '${evalPassword}';
GRANT CREATE TEMPORARY TABLES ON \`${dbName}\`.* TO '${evalUser}'@'localhost';
${harden ? "DROP DATABASE IF EXISTS test;\nDROP USER IF EXISTS ''@'localhost';\nDROP USER IF EXISTS ''@'%';" : ""}
FLUSH PRIVILEGES;
`.trim();

    const setupResult = runAdminSql(setupSql);
    if (setupResult.status !== 0) {
      fail("Failed to create database/users:");
      console.log(`      ${setupResult.stderr?.trim()}`);
      process.exit(1);
    }
    ok(`Created database "${dbName}" and users "${dbUser}" / "${evalUser}"`);

    // schema.sql is destructive (DROP TABLE IF EXISTS ...), so only run it
    // if the app's own tables don't already exist.
    const existingTables = run(bin, ["-u", dbUser, "-h", dbHost, dbName, "-N", "-e", "SHOW TABLES"], {
      env: { ...process.env, MYSQL_PWD: dbPassword },
    });
    const tableCount = (existingTables.stdout ?? "").trim().split("\n").filter(Boolean).length;

    let applySchema = true;
    if (tableCount > 0) {
      warn(`Database "${dbName}" already has ${tableCount} table(s).`);
      applySchema = await askYesNo(
        "Re-apply schema.sql anyway? This DROPS and recreates every table, destroying existing data.",
        false,
      );
    }

    if (applySchema) {
      const schemaPath = path.join(ROOT, "schema.sql");
      const schemaSql = fs.readFileSync(schemaPath, "utf-8");
      const schemaResult = run(bin, ["-u", dbUser, "-h", dbHost, dbName], {
        input: schemaSql,
        env: { ...process.env, MYSQL_PWD: dbPassword },
      });
      if (schemaResult.status !== 0) {
        fail("Failed to apply schema.sql:");
        console.log(`      ${schemaResult.stderr?.trim()}`);
        process.exit(1);
      }
      ok("Applied schema.sql");
    } else {
      info("Skipped schema.sql — keeping existing tables.");
    }

    // Seed an initial config row if missing, otherwise get-time 500s forever.
    const configCount = run(
      bin,
      ["-u", dbUser, "-h", dbHost, dbName, "-N", "-e", "SELECT COUNT(*) FROM config"],
      { env: { ...process.env, MYSQL_PWD: dbPassword } },
    );
    if (configCount.status === 0 && configCount.stdout.trim() === "0") {
      run(
        bin,
        [
          "-u", dbUser, "-h", dbHost, dbName, "-e",
          "INSERT INTO config (start_time, end_time) VALUES (UTC_TIMESTAMP(), UTC_TIMESTAMP() + INTERVAL 3 HOUR);",
        ],
        { env: { ...process.env, MYSQL_PWD: dbPassword } },
      );
      ok("Seeded an initial config row (placeholder start/end time — set the real schedule from /admin)");
    }
  }

  // [6] write .env files
  step(6, TOTAL_STEPS, "Writing .env files");
  writeEnvFile(
    envPath,
    {
      DB_HOST: dbHost,
      DB_NAME: dbName,
      DB_USER: dbUser,
      DB_PASSWORD: dbPassword,
      DB_EVAL_USER: evalUser,
      DB_EVAL_PASSWORD: evalPassword,
      JWT_SECRET: jwtSecret,
    },
    existingEnv,
  );
  ok(".env written");

  const clientEnvPath = path.join(ROOT, "client", ".env");
  const existingClientEnv = parseEnvFile(clientEnvPath);
  writeEnvFile(clientEnvPath, { VITE_MONACO_LOAD_LOCAL: "true" }, existingClientEnv);
  ok("client/.env written");

  // [7] install dependencies
  step(7, TOTAL_STEPS, `Installing dependencies (${pkgManager})`);
  const installCmd = pkgManager === "bun" ? ["install"] : ["install"];
  const rootInstall = run(pkgManager, installCmd, { cwd: ROOT, stdio: "inherit" });
  if (rootInstall.status !== 0) {
    fail("Root dependency install failed — see output above.");
    process.exit(1);
  }
  ok("Root dependencies installed");

  const bcryptCheck = run("node", ["-e", "require('bcrypt')"], { cwd: ROOT });
  if (bcryptCheck.status !== 0) {
    fail("bcrypt failed to load — it needs a native build toolchain.");
    printInstallHint("buildTools");
    info(`Then re-run: ${pkgManager} install`);
    process.exit(1);
  }
  ok("Verified native dependencies (bcrypt) load correctly");

  const clientDir = path.join(ROOT, "client");
  const clientInstall = run(pkgManager, installCmd, { cwd: clientDir, stdio: "inherit" });
  if (clientInstall.status !== 0) {
    fail("Client dependency install failed — see output above.");
    process.exit(1);
  }
  ok("Client dependencies installed");

  // [8] build client + verify
  step(8, TOTAL_STEPS, "Building client and verifying the setup");
  const buildCmd = pkgManager === "bun" ? ["run", "build"] : ["run", "build"];
  const build = run(pkgManager, buildCmd, {
    cwd: clientDir,
    stdio: "inherit",
    env: { ...process.env, VITE_MONACO_LOAD_LOCAL: "true" },
  });
  if (build.status !== 0) {
    fail("Client build failed — see output above.");
    process.exit(1);
  }
  ok("Client built");

  const verifyApp = run(bin, ["-u", dbUser, "-h", dbHost, dbName, "-e", "SELECT * FROM config"], {
    env: { ...process.env, MYSQL_PWD: dbPassword },
  });
  if (verifyApp.status === 0) ok("App DB user can read the config table");
  else warn("Could not verify the app DB user against the config table.");

  const evalDenied = run(bin, ["-u", evalUser, "-h", dbHost, dbName, "-e", "SELECT * FROM users"], {
    env: { ...process.env, MYSQL_PWD: evalPassword },
  });
  if (evalDenied.status !== 0 && /denied/i.test(evalDenied.stderr ?? "")) {
    ok("Eval sandbox user is correctly denied access to real tables");
  } else {
    warn("Could not verify the eval sandbox user's privilege boundary — check it manually.");
  }

  console.log(bold("\nAll set.\n"));
  console.log(`  Start the server with: ${bold(`${pkgManager === "bun" ? "bun run" : "npm run"} start`)}`);
  console.log(`  The app will be available at ${bold("http://localhost:5000")}`);
  console.log(`  Create an admin (needed for the /admin schedule panel):`);
  console.log(`    ${bin} -u ${dbUser} -h ${dbHost} -p ${dbName} -e "INSERT INTO admins (user_id) SELECT id FROM users WHERE username='<their-username>';"`);
  console.log();

  rl.close();
}

main().catch((err) => {
  console.error(red(`\nSetup failed: ${err.message}`));
  rl.close();
  process.exit(1);
});
