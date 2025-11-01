#!/usr/bin/env bash
set -u -o pipefail

echo "[start] Waiting for database and syncing Prisma schema..."

# Retry prisma db push until it succeeds or max attempts reached
attempt=1
max_attempts=30
sleep_seconds=3
while true; do
  echo "[start] prisma db push attempt ${attempt}/${max_attempts}"
  ./node_modules/.bin/prisma db push --schema ./prisma/schema.prisma && {
    echo "[start] Prisma schema synced successfully."
    break
  }
  if [ "$attempt" -ge "$max_attempts" ]; then
    echo "[start] Failed to sync Prisma schema after ${max_attempts} attempts. Starting server anyway."
    break
  fi
  attempt=$((attempt + 1))
  sleep "$sleep_seconds"
done

echo "[start] Launching server..."
exec node dist/main.js