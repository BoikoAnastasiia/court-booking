-- Runs once on first container start: a separate database for the test suite
-- so tests can truncate tables without touching demo data.
CREATE DATABASE courts_test;
