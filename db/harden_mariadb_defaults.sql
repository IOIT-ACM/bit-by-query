-- Removes MariaDB/MySQL's legacy insecure defaults: the `test` database and
-- anonymous-user accounts, both of which grant any authenticated connection
-- (including the eval sandbox user) unrestricted access to a real database.
-- This is what `mysql_secure_installation` normally does; run this if you
-- haven't already gone through that.
--
-- Run as root/admin: sudo mysql < db/harden_mariadb_defaults.sql

DROP DATABASE IF EXISTS test;
DROP USER IF EXISTS ''@'localhost';
DROP USER IF EXISTS ''@'%';
FLUSH PRIVILEGES;
