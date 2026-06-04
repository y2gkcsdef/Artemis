#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
DUMP_FILE="$SCRIPT_DIR/artemis_init.dump"

if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Could not find $DUMP_FILE."
  echo "Make sure artemis_init.dump is in the same folder as this script."
  exit 1
fi

if ! command -v pg_restore >/dev/null 2>&1; then
  echo "Could not find pg_restore."
  echo "Install PostgreSQL, or add the PostgreSQL bin folder to PATH."
  exit 1
fi

echo "Using: $(command -v pg_restore)"
echo "Restoring: $DUMP_FILE"
echo
echo "You will be prompted for the PostgreSQL password for user postgres."
echo "This restore uses --clean and --create."
echo

pg_restore \
  --host=localhost \
  --port=5432 \
  --username=postgres \
  --dbname=postgres \
  --clean \
  --if-exists \
  --create \
  --no-owner \
  --no-privileges \
  "$DUMP_FILE"

echo
echo "Restore complete."
