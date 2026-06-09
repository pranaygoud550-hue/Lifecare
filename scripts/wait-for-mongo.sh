#!/usr/bin/env sh
# Wait until MongoDB accepts connections on 127.0.0.1:27017
HOST="${MONGO_HOST:-127.0.0.1}"
PORT="${MONGO_PORT:-27017}"
MAX="${MONGO_WAIT_SECONDS:-60}"

echo "Waiting for MongoDB at ${HOST}:${PORT} (max ${MAX}s)..."

i=0
while [ "$i" -lt "$MAX" ]; do
  if (echo > "/dev/tcp/${HOST}/${PORT}") 2>/dev/null; then
    echo "MongoDB is ready."
    exit 0
  fi
  # macOS fallback
  if nc -z "$HOST" "$PORT" 2>/dev/null; then
    echo "MongoDB is ready."
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done

echo "MongoDB did not become ready in ${MAX}s."
echo "Run: npm run db:up"
exit 1
