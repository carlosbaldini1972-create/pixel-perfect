#!/usr/bin/env bash
# Apply app migrations AFTER the stack is up (so GoTrue has created
# the `auth` schema and `auth.users` table that our migrations FK to).
#
# Usage (from deploy/):  ./db/apply-migrations.sh

set -e
cd "$(dirname "$0")/.."

# Read vars from .env WITHOUT sourcing (avoids shell parse errors on spaces)
POSTGRES_DB=$(grep -E '^POSTGRES_DB=' .env | head -1 | cut -d= -f2-)
POSTGRES_DB=${POSTGRES_DB:-postgres}
POSTGRES_PASSWORD=$(grep -E '^POSTGRES_PASSWORD=' .env | head -1 | cut -d= -f2-)

echo "Waiting for auth.users to exist..."
for i in $(seq 1 60); do
  if docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
       psql -h 127.0.0.1 -U supabase_admin -d "$POSTGRES_DB" -tAc \
       "SELECT to_regclass('auth.users') IS NOT NULL" 2>/dev/null | grep -q t; then
    echo "auth.users is ready."
    break
  fi
  sleep 2
done

for f in db/migrations/*.sql; do
  echo ">>> Applying $f"
  docker compose exec -T -e PGPASSWORD="$POSTGRES_PASSWORD" postgres \
    psql -h 127.0.0.1 -v ON_ERROR_STOP=1 \
    -U supabase_admin -d "$POSTGRES_DB" < "$f"
done

echo "All migrations applied."
