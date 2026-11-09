# Web App

A web application built on the Next.js App Router. UI components, environment variable validation, data fetching, and the database (Prisma + Supabase) are already wired up, so you can start writing feature code right away.

## Tech stack

| Area | Stack |
| --- | --- |
| Framework | Next.js 16 (App Router, Turbopack), React 19, TypeScript 6 |
| Styling / UI | Tailwind CSS 4, shadcn/ui (`base-vega`, Base UI), `cn`, lucide-react, Pretendard |
| Data fetching | ky (HTTP client), TanStack Query |
| Database | Prisma ORM 7 (`@prisma/adapter-pg`), Supabase PostgreSQL |
| Auth (optional) | Supabase Auth (`@supabase/ssr`) — clients and session-refresh proxy |
| Validation | zod (environment variables and server input) |
| Linting | ESLint 10 (`eslint-config-next`) |
| Deployment | Any Node.js host, or the Docker image |

## Requirements

- Node.js 26 (pinned in `.nvmrc` and `engines`; CI uses the same file)
- pnpm 12 (pinned via the `packageManager` field). Install it as described in the [pnpm installation guide](https://pnpm.io/installation); any pnpm 12 switches to the pinned version inside the project. Node.js 26 no longer ships corepack.

## Getting started

1. Run `pnpm install`. Its postinstall step generates the Prisma Client.
2. Copy `.env.example` to `.env`. It runs as is, with every integration off; fill in the values you use (see "Environment variables").
3. Run `pnpm dev`. The app is at http://localhost:3000 and the UI component showcase at http://localhost:3000/design-system (development server only, unless `NEXT_PUBLIC_DESIGN_SYSTEM=1`).

### Project setup

1. Change `name` in `package.json` to your service name. The test database's Compose project follows it; the development Compose project follows the folder name.
2. Set `NEXT_PUBLIC_APP_NAME`, and update the description in `app/layout.tsx`.
3. If the service has sign-in, create the sign-in page and set `SIGN_IN_PATH` in `lib/auth.ts` to its path (default `/login`).
4. Replace `app/page.tsx` with your service's landing page, and `app/icon.svg` with the service icon.
5. Delete `app/(design-system)/` if you don't need the design system page, and the showcase rule under "UI" in `AGENTS.md`.

## Environment variables

Copy `.env.example` to `.env`. The Prisma CLI loads only `.env` through `dotenv`, so keep the database variables in `.env`, not `.env.local`.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_APP_NAME` | App name in page titles and the UI. Defaults to `Web App`. Read at build time, so rebuild after changing it. |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase clients. Leave empty to disable the Supabase integration. |
| `DATABASE_URL` | App runtime (Prisma Client). Supavisor **transaction pooler (6543)**. Leave it and `DIRECT_URL` empty to run without a database. |
| `DIRECT_URL` | Prisma CLI (migrate, etc.). **Session pooler (5432)**. The direct host is IPv6-only. |
| `SERVICE_NAME`, `APP_ENV` | `service.name` and `deployment.environment.name` in every server log line. Default to `name` in `package.json`, and to `NODE_ENV`. |
| `NOTIFY_SLACK_WEBHOOK_URL` | Incoming webhook (`https` only) of the chat channel that receives server notifications; every topic goes there for now. A secret: anyone holding it can post to the channel. Leave empty to skip notifications. |
| `NEXT_PUBLIC_SENTRY_DSN` | Sentry error reporting from the browser and the server. Leave empty to disable Sentry; errors are then only logged on the server. |
| `NEXT_PUBLIC_DESIGN_SYSTEM` | `1` opens the `/design-system` showcase in a production build (for example on a preview deployment). Left empty, it answers 404 everywhere except the development server. Read at build time. |
| `SENTRY_AUTH_TOKEN`, `SENTRY_ORG`, `SENTRY_PROJECT` | Build only: source map upload to Sentry, read by the Sentry build plugin. Set them in the build environment; leave empty to skip the upload. |

Application code never reads `process.env` directly; it goes through the modules below. Invalid values surface as zod errors when the module loads. The exceptions are build-time values outside the app code: `next.config.ts` (`CI`, `PLAYWRIGHT`, `NEXT_OUTPUT_STANDALONE`) and the Sentry build plugin (`SENTRY_*`), `NODE_ENV` (set and inlined by Next.js), and the test-only `TEST_DATABASE_URL`.

- `config/env.ts` — public variables (`NEXT_PUBLIC_*`)
- `config/env.server.ts` — server-only variables. Anything that must not reach the client bundle belongs here.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Development server |
| `pnpm build` / `pnpm start` | Production build / start |
| `pnpm docker:db` | Start the local development database (`docker-compose.yaml`, port 5432) |
| `pnpm docker:up` / `pnpm docker:down` | Build and start the production image / stop every Compose service |
| `pnpm lint` | ESLint |
| `pnpm typecheck` | Generates the Next.js route types (`next typegen`), then runs `tsc --noEmit`. Works on a fresh clone without a prior build |
| `pnpm test` | All tests (`test:vitest`, then `test:playwright`) |
| `pnpm test:vitest` | Vitest (`*.vitest.test.ts`). Needs the test database (`pnpm test:db:up`) |
| `pnpm test:db:up` / `pnpm test:db:down` | Start / stop the test database (`docker-compose.test.yaml`). Its data lives in memory and is gone after stopping |
| `pnpm test:vitest:unit` | Vitest without the database |
| `pnpm test:playwright` | Playwright (`*.playwright.test.ts`): builds with `PLAYWRIGHT=1`, starts the app, and drives Chromium. Needs the test database (`pnpm test:db:up`); run `pnpm exec playwright install chromium` once first |
| `pnpm db:generate` | Generate the Prisma Client (also runs on `postinstall`) |
| `pnpm db:migrate` | Create and apply migrations on the development database (`prisma migrate dev`) |
| `pnpm db:deploy` | Apply migrations to the production database (`prisma migrate deploy`) |
| `pnpm db:status` | Show which migrations are applied or pending (`prisma migrate status`) |
| `pnpm db:studio` | Prisma Studio |

## Project structure

The folder layout, and what belongs in each folder, is in [AGENTS.md](AGENTS.md#structure).

## Documentation

How each part works, with diagrams, lives in [docs/](docs/README.md). The rules are in [AGENTS.md](AGENTS.md).

| Page | Covers |
| --- | --- |
| [Architecture](docs/architecture.md) | Layers, the server/client boundary, client-side data, UI components |
| [Request flow](docs/request-flow.md) | The proxy, security headers and CSP, page responses for sign-in, not found, and errors |
| [Auth](docs/auth.md) | Requester identity and session refresh |
| [Data layer](docs/data-layer.md) | The data access layer, database connections, schema, migrations, model conventions |
| [Errors](docs/errors.md) | Problems, error handlers, client error handling, Sentry, the health check |
| [Logging](docs/logging.md) | Structured server logs, request IDs, what is never logged, log collection |
| [Notifications](docs/notifications.md) | Server notifications to a chat service: kinds of notification, topics and destinations, providers, best-effort delivery |
| [Testing](docs/testing.md) | Test tools, the test database, the fake Auth server, shared helpers |
| [Delivery](docs/delivery.md) | CI, supply chain, dependency updates, environment variables, the Docker image, Compose |
| [Coding agents](docs/agents.md) | Instruction files, skills, subagents, hooks, machine checks, the docs and endpoint review flows |

Business domain pages are listed under [Domains](docs/README.md#domains).

## Deployment

1. Register the environment variables (`DATABASE_URL`, Supabase variables, `NEXT_PUBLIC_SENTRY_DSN`, and the build-only `SENTRY_*` variables) on the host.
2. Run the app in the same region as the Supabase project.
3. `postinstall` generates the Prisma Client during the build. Run migrations separately with `pnpm db:deploy`.
4. For the Docker image, see [Delivery](docs/delivery.md).

## AI agents

- `AGENTS.md` / `CLAUDE.md` — instructions for coding agents (the Next.js block is managed by `next dev`)
- `.agents/skills`, `.claude/skills` — skills for the Prisma CLI / Client API, Supabase Postgres best practices, writing and reviewing the docs, and reviewing the server entry points
- `.claude/agents`, `.claude/hooks` — the `docs-writer`, `docs-reviewer`, and read-only `endpoint-reviewer` subagents, and the hooks that limit what they can edit and run

How these fit together, and which flow to follow after a change, is in [Coding agents](docs/agents.md).
