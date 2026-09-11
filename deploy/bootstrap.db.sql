-- One-time setup for a new dreamcatch database; run as postgres.
-- Set dc_app password separately through a protected secret, never in this file.
BEGIN;
CREATE ROLE dc_owner NOLOGIN;
CREATE ROLE dc_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION;
REVOKE ALL ON DATABASE dreamcatch FROM PUBLIC;
GRANT CONNECT ON DATABASE dreamcatch TO dc_app;
REVOKE CREATE ON SCHEMA public FROM PUBLIC;
CREATE SCHEMA dc AUTHORIZATION dc_owner;
GRANT USAGE ON SCHEMA dc TO dc_app;
ALTER ROLE dc_app IN DATABASE dreamcatch SET search_path = dc, pg_catalog;
ALTER ROLE dc_app SET statement_timeout = '15s';
ALTER ROLE dc_app SET idle_in_transaction_session_timeout = '30s';
COMMIT;
