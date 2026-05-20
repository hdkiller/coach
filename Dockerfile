FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN npm install -g pnpm@9.13.0
RUN apt-get update -y && apt-get install -y openssl ca-certificates && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Stage 1: Install all deps (dev + prod) — needed for the Nuxt build
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile

# Stage 2: Install production deps only — leaner node_modules for the runner
FROM base AS prod-deps
COPY package.json pnpm-lock.yaml ./
COPY prisma ./prisma/
COPY prisma.config.ts ./
RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile --prod

# Stage 3: Build the application
FROM base AS builder
ARG COMMIT_SHA
ARG SENTRY_AUTH_TOKEN
# Tune heap for available RAM. Default 4096 MB is safe on most Docker hosts.
# Increase if build OOMs: docker build --build-arg NODE_MAX_HEAP=6144 ...
ARG NODE_MAX_HEAP=4096
ENV COMMIT_SHA=${COMMIT_SHA}
ENV SENTRY_AUTH_TOKEN=${SENTRY_AUTH_TOKEN}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# prisma generate already ran via postinstall in the deps stage; call nuxt build directly
RUN NODE_OPTIONS="--max-old-space-size=${NODE_MAX_HEAP} --expose-gc" pnpm exec nuxt build

# Stage 4: Production image
FROM base AS runner
ENV NODE_ENV=production

COPY --from=builder /app/.output ./.output
COPY --from=prod-deps /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/app/emails ./app/emails
COPY --from=builder /app/app/utils ./app/utils
COPY --from=builder /app/cli ./cli
COPY --from=builder /app/server ./server
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/start.sh ./start.sh

RUN chmod +x ./start.sh

EXPOSE 3000
CMD ["./start.sh"]
