#!/usr/bin/env bash
set -e

test -f .env.e2e || cp .env.e2e.example .env.e2e

pnpm e2e:up:infra
pnpm e2e:db:prepare

# Compute hash of app source files that impact the app-e2e docker image
APP_HASH=$(git log -1 --format="%h" -- app server prisma package.json pnpm-lock.yaml Dockerfile.e2e docker-compose.e2e.yml 2>/dev/null || echo "latest")
IMAGE_TAG="coach-e2e-app:${APP_HASH}"

if docker image inspect "$IMAGE_TAG" >/dev/null 2>&1; then
  echo "=> Reusing existing Docker image $IMAGE_TAG (app source unchanged)"
  docker tag "$IMAGE_TAG" coach-e2e-app:local
else
  echo "=> Building Docker image for app source hash $APP_HASH"
  pnpm e2e:build
  docker tag coach-e2e-app:local "$IMAGE_TAG" || true
fi

docker compose --env-file .env.e2e -p coach-e2e -f docker-compose.e2e.yml up -d --wait app-e2e
