#!/usr/bin/env bash
# Apply app migrations AFTER the stack is up (so GoTrue has created
# the `auth` schema and `auth.users` table that our migrations FK to).
#
# Usage (run on the host, from deploy/):
#   ./db/apply-migrations.sh
#
# Idempotency: each migration uses CREATE ... / CREATE OR REPLACE / etc.
# Re-running may error on duplicate objects; that's expected.

set -e

cd "$(dirname "$0")/.."

# Load .env so we get POSTGRES_DB / POSTGRES_PASSWORD
set -a
. ./.env
set +a

# Wait until GoTrue has finished its own migrations (auth.users must exist).
echo "Waiting for auth.users to exist..."
for i in $(seq 1 60); do
  if docker compose exec -T postgres psql -U supabase_admin -d "$POSTGRES_DB" -tAc \
       "SELECT to_regclass('auth.users') IS NOT NULL" 2>/dev/null | grep -q t; then
    echo "auth.users is ready."
    break
  fi
  sleep 2
done

for f in db/migrations/*.sql; do
  echo ">>> Applying $f"
  docker compose exec -T postgres psql -v ON_ERROR_STOP=1 \
    -U supabase_admin -d "$POSTGRES_DB" < "$f"
done

echo "All migrations applied."
