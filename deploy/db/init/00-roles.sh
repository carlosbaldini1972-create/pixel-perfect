#!/bin/bash
# Bootstrap roles + schemas Supabase services expect.
# Runs once on first Postgres startup. Uses a shell script (not .sql) so we can
# safely inject $POSTGRES_PASSWORD as a psql variable.

set -e

psql -v ON_ERROR_STOP=1 \
     --username "$POSTGRES_USER" \
     --dbname "$POSTGRES_DB" \
     -v pgpass="$POSTGRES_PASSWORD" <<-'EOSQL'
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
END
$$;

-- Roles with passwords (use \gexec so :'pgpass' is interpolated by psql).
SELECT format('CREATE ROLE authenticator NOINHERIT LOGIN PASSWORD %L', :'pgpass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator')
\gexec

SELECT format('CREATE ROLE supabase_auth_admin LOGIN PASSWORD %L CREATEROLE', :'pgpass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_auth_admin')
\gexec

SELECT format('CREATE ROLE supabase_storage_admin LOGIN PASSWORD %L CREATEROLE', :'pgpass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_storage_admin')
\gexec

SELECT format('CREATE ROLE supabase_admin LOGIN PASSWORD %L SUPERUSER CREATEDB CREATEROLE REPLICATION BYPASSRLS', :'pgpass')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin')
\gexec

GRANT anon, authenticated, service_role TO authenticator;

-- Dedicated schemas owned by the respective admin roles, so GoTrue / Storage
-- can run their own migrations (CREATE TABLE schema_migrations, etc.).
CREATE SCHEMA IF NOT EXISTS auth    AUTHORIZATION supabase_auth_admin;
CREATE SCHEMA IF NOT EXISTS storage AUTHORIZATION supabase_storage_admin;

ALTER ROLE supabase_auth_admin    SET search_path = auth, public;
ALTER ROLE supabase_storage_admin SET search_path = storage, public;

GRANT USAGE ON SCHEMA auth    TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES    TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON FUNCTIONS TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO anon, authenticated, service_role;
EOSQL
