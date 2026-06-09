#!/usr/bin/env sh
# Wait until the backend answers /health (avoids Vite proxy ECONNREFUSED on startup).

PORT="${PORT:-5001}"
URL="http://127.0.0.1:${PORT}/health"
MAX="${WAIT_FOR_API_SECONDS:-90}"
i=0

while [ "$i" -lt "$MAX" ]; do
  if curl -sf "$URL" >/dev/null 2>&1; then
    echo "✅ API ready at $URL"
    exit 0
  fi
  i=$((i + 1))
  sleep 1
done

echo "❌ Backend did not respond at $URL within ${MAX}s."
echo "   Run: npm run dev:backend   (in another terminal) and check errors."
exit 1
