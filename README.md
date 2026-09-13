# Bit By Query

**Bit By Query** is a web-based platform where users can compete in SQL competitions. It offers a variety of challenges and a leaderboard to track participants' progress.

## Features

- **User Authentication**: Secure user registration and login.
- **SQL Challenges**: Solve curated SQL problems of varying difficulty.
- **Leaderboards**: Compete with others, with a small bonus for solving early in the competition window.
- **Real-time Countdown**: Timed challenges to keep the competition intense.
- **Admin Panel**: Live schedule control (start/extend/end), a real-time event log (auth, admin actions, errors, submissions), and a one-click submissions reset with an automatic backup, for use between test runs.

## Grading

Submitted queries run against real MySQL, not a simulated database. Each test case gets a fresh connection, using a dedicated, minimally-privileged DB user that can only create/use `TEMPORARY` tables on the app's database - it has no access to the real tables (`users`, `submissions`, `config`, etc.) or any other database. See `db/setup_eval_user.sql`. Grading logic lives in `lib/grading.js` and is shared by the live evaluate route and `scripts/test-problem.js`, a CLI for testing a candidate solution against a problem before adding it to a problem set.

## Getting Started

On a fresh machine, run `./setup.sh` (or `npm run setup`). It checks for Node.js, a package manager, and MySQL/MariaDB, printing install instructions for anything missing; then creates the database and DB users, writes `.env` files, installs dependencies, and builds the client.

```bash
./setup.sh
npm start   # or: npm run dev
```

## Project Structure

```plaintext
.
├── client                     # Frontend code (React, Vite)
│   ├── src
│   │   ├── apiClient.js       # API interaction
│   │   ├── components         # Reusable React components
│   │   ├── context            # TimeContext (competition schedule)
│   │   ├── Admin.jsx           # Admin panel (schedule, event logs, reset)
│   │   ├── Home.jsx            # Competition page
│   │   ├── LeaderBoard.jsx     # Leaderboard
│   │   ├── Login.jsx / Register.jsx
│   │   └── middleware.jsx      # Route protection
│   ├── tailwind.config.js
│   └── vite.config.js
├── server.js                  # Backend server (Node.js, Express)
├── schema.sql                 # Database schema
├── lib
│   └── grading.js             # Shared MySQL-based grading logic
├── scripts
│   ├── setup.mjs               # Fresh-machine setup (see setup.sh)
│   ├── test-problem.js         # Test a candidate solution against a problem
│   └── generate-solutions.js   # Regenerate the answer key sheet (SOLUTIONS.md)
├── db
│   ├── setup_eval_user.sql     # Creates the sandboxed grading DB user
│   └── harden_mariadb_defaults.sql
├── problems                   # JSON files containing challenges, one per event
├── hashPassword.js            # CLI: hash a password for manually seeding a user
└── README.md
```

## License

[MIT](LICENSE) © 2026 AISSMS IOIT ACM Student Chapter
