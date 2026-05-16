#!/bin/sh

# Exit on error
set -e

if [ -n "$DATABASE_URL" ] && [ "$DATABASE_URL" != "postgresql://dummy:dummy@localhost:5432/dummy" ]; then
  echo "🚀 Running database migrations..."
  node_modules/.bin/prisma migrate deploy
else
  echo "⚠️ Skipping migrations: DATABASE_URL is not set or is dummy."
fi

echo "        Starting application..."
exec node .output/server/index.mjs
