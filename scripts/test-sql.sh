#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
# Disposable, isolated PostgreSQL tests: no host port, no persistent volume.
container_name="bbfind-sql-test-$$"
cleanup(){ docker rm -f "$container_name" >/dev/null 2>&1 || true; }
trap cleanup EXIT
# Trust applies only inside this isolated test container, with no exposed port.
docker run -d --name "$container_name" -e POSTGRES_HOST_AUTH_METHOD=trust postgres:17-alpine >/dev/null
for attempt in $(seq 1 40); do
 if docker exec "$container_name" pg_isready -U postgres >/dev/null 2>&1; then break; fi
 sleep 1
done
docker exec -i "$container_name" psql -X -U postgres -v ON_ERROR_STOP=1 -q < tests/sql/bootstrap.sql
docker exec -i "$container_name" psql -X -U postgres -v ON_ERROR_STOP=1 -q < supabase/migrations/202610270001_directory.sql
docker exec -i "$container_name" psql -X -U postgres -v ON_ERROR_STOP=1 -q < tests/sql/access.sql
