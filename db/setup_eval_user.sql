-- Creates a tightly-scoped MySQL user for executing untrusted, competitor-submitted
-- SQL queries during evaluation. It is intentionally separate from the app's main
-- `renarin` user (which has full privileges on `bbq`).
--
-- This user gets ONLY `CREATE TEMPORARY TABLES` on `bbq` - no SELECT/INSERT/UPDATE/
-- DELETE/DROP on real tables, no access to any other database. A submitted query
-- that creates a temp table (e.g. `products`) can freely use it, but a query that
-- tries to read/write a real table (`users`, `submissions`, `config`, or a temp
-- table it never created) is rejected by MySQL's privilege system, not by
-- application logic.
--
-- Run as root/admin: sudo mysql < db/setup_eval_user.sql
-- Then set a real password below before running, and add it to .env as
-- DB_EVAL_USER / DB_EVAL_PASSWORD.

CREATE USER IF NOT EXISTS 'bbq_eval'@'localhost' IDENTIFIED BY 'CHANGE_ME_BEFORE_RUNNING';
GRANT CREATE TEMPORARY TABLES ON `bbq`.* TO 'bbq_eval'@'localhost';
FLUSH PRIVILEGES;
