#!/usr/bin/env sh
# Start MongoDB via Docker if available; otherwise print how to run it locally.

if command -v docker >/dev/null 2>&1; then
  echo "Starting MongoDB with Docker..."
  docker compose -f "$(dirname "$0")/../docker-compose.yml" up -d mongodb
  exit $?
fi

echo ""
echo "Docker is not installed."
echo ""
echo "Choose one way to run MongoDB:"
echo "  A) Install Docker Desktop, then:  npm run db:up"
echo "  B) Homebrew MongoDB:"
echo "       brew tap mongodb/brew"
echo "       brew install mongodb-community"
echo "       brew services start mongodb-community@7.0"
echo "  C) MongoDB Atlas (cloud): set MONGODB_URI in backend/.env"
echo ""
exit 0
