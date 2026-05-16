FROM node:22-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
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
ENV COMMIT_SHA=${COMMIT_SHA}
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN NODE_OPTIONS=--max-old-space-size=12288 pnpm build

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
