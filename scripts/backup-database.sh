#!/usr/bin/env bash
set -euo pipefail
# Configure standard PGHOST/PGPORT/PGUSER/PGDATABASE/PGPASSWORD securely; never trace.
if [[ $# -ne 1 ]]; then echo 'Usage: scripts/backup-database.sh /private/backup.dump' >&2; exit 1; fi
if [[ -z ${PGHOST:-} || -z ${PGUSER:-} || -z ${PGDATABASE:-} ]]; then echo 'Configure PostgreSQL connection variables first.' >&2; exit 1; fi
backup_target=$(realpath -m -- "$1")
repo_root=$(git rev-parse --show-toplevel)
case "$backup_target" in "$repo_root"|"$repo_root"/*) echo 'Backups must be outside the repository.' >&2; exit 1;; esac
if [[ -e "$backup_target" ]]; then echo 'Refusing to overwrite an existing backup.' >&2; exit 1; fi
umask 077
pg_dump --format=custom --no-owner --file="$backup_target"
echo 'Database backup written. Encrypt it and pair it with a storage backup.'
