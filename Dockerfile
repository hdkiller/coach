# Use Node.js 22 as the base image
FROM node:24-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
ENV PNPM_CONFIG_IGNORE_SCRIPTS="false"
ENV PNPM_CONFIG_ONLY_BUILT_DEPENDENCIES=""
RUN corepack enable

# Install system dependencies needed for native module builds
RUN apt-get update -y && apt-get install -y python3 make g++ openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Stage 1: Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml .npmrc* ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm approve-builds --all || true; pnpm install --frozen-lockfile --config.ignore-scripts=false

# Stage 2: Build the application
FROM base AS builder
ARG COMMIT_SHA
ARG SENTRY_AUTH_TOKEN
ENV COMMIT_SHA=${COMMIT_SHA}
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
ENV CHAT_TURN_RUNNER_ENABLED=false
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Typecheck is NOT run here: the CI workflow (.github/workflows/ci.yml) runs it on a
# GitHub-hosted runner and gates the deploy job, so it fails minutes earlier and we
# don't pay for it twice per push. Run `pnpm typecheck` locally before building by hand.
RUN NODE_OPTIONS=--max-old-space-size=14336 pnpm build

# Stage 3: Production image
FROM base AS runner
ENV NODE_ENV=production

# Copy built application
COPY --from=builder /app/.output ./.output
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/app/emails ./app/emails
COPY --from=builder /app/app/utils ./app/utils
COPY --from=builder /app/cli ./cli
COPY --from=builder /app/server ./server
COPY --from=builder /app/shared ./shared
COPY --from=builder /app/trigger ./trigger
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/start.sh ./start.sh

# Make start.sh executable
RUN chmod +x ./start.sh

# Expose the port the app runs on
EXPOSE 3000

# Default command
CMD ["./start.sh"]
