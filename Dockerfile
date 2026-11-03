# syntax=docker/dockerfile:1

# Production image. It holds only the Next.js standalone output; sources, dev dependencies, and .env stay out
# (.dockerignore). Environment variables are never listed one by one: the build receives one env file as the
# BuildKit secret build-env, and the runtime receives container environment variables, so adding a variable never
# changes this file. Change the Node major version together with .nvmrc.
ARG NODE_VERSION=26

FROM node:${NODE_VERSION}-alpine AS base
ENV NEXT_TELEMETRY_DISABLED=1
WORKDIR /app
# Node.js 25+ no longer ships corepack, so install the pnpm version pinned in packageManager directly.
COPY package.json ./
RUN npm install -g "$(node -p "require('./package.json').packageManager")"

# Install dependencies. postinstall generates the Prisma Client (app/generated/prisma), so copy the schema too.
FROM base AS deps
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml prisma7.config.ts ./
COPY prisma ./prisma
RUN --mount=type=cache,id=pnpm-store,target=/root/.local/share/pnpm/store \
    pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/app/generated ./app/generated
COPY . .
ENV NEXT_OUTPUT_STANDALONE=1
# build-env appears as .env.production.local only during the build and stays out of the image layers. Next reads it
# to inline NEXT_PUBLIC_* into the bundle (the Sentry source map token is read from it too) and does not copy it into
# the standalone output, which copies only .env and .env.production. Without it, every optional variable builds empty.
RUN --mount=type=secret,id=build-env,target=/app/.env.production.local \
    pnpm build

# Starts from plain Node, so pnpm and package.json stay out of the image.
FROM node:${NODE_VERSION}-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0
COPY --from=builder --chown=node:node /app/.next/standalone ./
COPY --from=builder --chown=node:node /app/.next/static ./.next/static
USER node
EXPOSE 3000
HEALTHCHECK --interval=10s --timeout=3s --start-period=10s --retries=3 \
  CMD ["node", "-e", "fetch('http://localhost:3000/api/health').then((r) => process.exit(r.ok ? 0 : 1), () => process.exit(1))"]
CMD ["node", "server.js"]
