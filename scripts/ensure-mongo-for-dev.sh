#!/usr/bin/env sh
# Skip local Docker/Mongo wait when backend/.env points to Atlas or in-memory DB.

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/backend/.env"

if [ -f "$ENV_FILE" ]; then
  # shellcheck disable=SC2046
  export $(grep -E '^USE_MEMORY_DB=' "$ENV_FILE" 2>/dev/null | xargs) || true
  MONGODB_URI=$(grep '^MONGODB_URI=' "$ENV_FILE" 2>/dev/null | sed 's/^MONGODB_URI=//')
fi

if [ "$USE_MEMORY_DB" = "true" ]; then
  echo "ℹ️  USE_MEMORY_DB=true — skipping local MongoDB startup."
  exit 0
fi

case "$MONGODB_URI" in
  mongodb+srv://*)
    echo "ℹ️  Using MongoDB Atlas — skipping local Docker/Mongo wait."
    echo "   Ensure Network Access allows your IP (or 0.0.0.0/0 for dev)."
    echo "   If Atlas is unreachable, the backend falls back to in-memory MongoDB in development."
    exit 0
    ;;
esac

echo "ℹ️  Local MongoDB expected at 127.0.0.1:27017"
npm run db:up 2>/dev/null || true
npm run db:wait 2>/dev/null || {
  echo "⚠️  Local MongoDB not ready. Use Atlas in backend/.env or: brew services start mongodb-community@7.0"
  exit 0
}
