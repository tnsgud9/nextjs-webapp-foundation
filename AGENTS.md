<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# Project guidelines

This is a web application built on the Next.js App Router. Keep shared infrastructure (`lib/`, `components/ui/`, `components/shared/`, `config/`) free of domain-specific names and business logic; put domain code in `data/` (server), `domains/<domain>/` (code the server and the browser share), and the routes under `app/`.

## Structure

```
app/                     # Routes (App Router)
├── (design-system)/     # /design-system UI showcase (closed in production unless NEXT_PUBLIC_DESIGN_SYSTEM=1)
├── **/_components/      # Components used by a single route
├── api/health/          # Liveness check (no database access)
├── fonts/               # Pretendard official subset and Pretendard JP, one file per weight (loaded from app/shared.css)
├── generated/prisma/    # Generated Prisma Client
├── playwright/          # Pages built only for Playwright (page.playwright.tsx)
├── globals.css          # shadcn/Tailwind base styles (managed by shadcn, do not edit)
├── shared.css           # Project styles: theme token overrides, extra tokens, utilities
├── error.tsx            # Unexpected page errors (generic message + digest)
├── global-error.tsx     # Root layout failures
├── not-found.tsx        # Unknown routes and notFound()
├── icon.svg             # Neutral placeholder site icon (replace with the service icon)
└── layout.tsx           # Root layout · global providers
components/
├── ui/                  # shadcn/ui source (managed by the shadcn CLI, do not edit)
├── shared/              # Derived and composed components (wrap ui to extend it)
└── *-provider.tsx       # Client providers
config/
├── env.ts               # Public environment variables (NEXT_PUBLIC_*)
└── env.server.ts        # Server-only environment variables
data/                    # Data access layer (server-only): the only code that uses the database and Redis
domains/                 # Domain code the server and the browser share, one folder per domain (no server-only imports)
notifications/           # Kinds of notification, one file each (server-only), sent with notify() from lib/notify
hooks/                   # Client hooks
├── use-mobile.ts        # From shadcn (sidebar), do not edit
└── use-highlighted-code.ts # From shadcn (code-block), do not edit
test-utils/              # Test-only helpers: shared/ (tool-agnostic), then vitest/, playwright/
lib/
├── auth.ts              # Requester identity: getCurrentUser() / requireUser() (server-only)
├── csp.ts               # Content-Security-Policy, shared by next.config.ts and the proxy
├── db.ts                # Single Prisma Client instance (server-only), imported only by data/
├── highlighter.tsx      # Shiki code highlighter from shadcn (code-block), do not edit
├── problem.ts           # Shared RFC 9457 error contract: Problem, ProblemError, ActionResult
├── ky.ts                # HTTP client
├── query-client.ts      # TanStack Query client
├── redis/               # Optional Redis: client.ts (single client, used only by data/), model.ts (defineRedisModel)
├── notify/              # Server notifications to a chat service: notify(), defineNotification(), providers/ (server-only)
├── sentry/              # Sentry: options.ts (shared), server.ts, client.ts
├── server/              # Server-only: error → Problem mapping, error handlers, input validation, structured logger
├── supabase/            # Supabase browser / server clients, session refresh
└── utils.ts             # cn re-export (shadcn alias)
docs/                    # How the app works, with diagrams (index: docs/README.md)
prisma/
├── schema.prisma        # generator / datasource
└── models/              # Models, one file per domain
redis/
└── models/              # Redis models, one file each (defineRedisModel), used only from data/
.agents/skills/          # Agent skills, identical to .claude/skills/
.claude/                 # Claude Code: skills/, agents/ (docs-writer, docs-reviewer, endpoint-reviewer), hooks/
.github/                 # CI workflow (workflows/ci.yml) and its shared setup action
Dockerfile               # Production image (standalone output); .dockerignore keeps .env out
docker-compose.yaml      # Development database for pnpm dev (docker:db), optional Redis (docker:redis), and the app container (docker:up)
docker-compose.test.yaml # Test-only Postgres and Redis for local runs (pnpm test:db:up / test:db:down)
.env.test                # Environment of every test (committed, no secrets), set in place of .env
instrumentation.ts       # Server start-up entry (loads lib/sentry/server), onRequestError (lib/server/request-errors)
instrumentation-client.ts # Browser start-up entry (loads lib/sentry/client)
prisma7.config.ts        # Prisma CLI config
proxy.ts                 # Request proxy (Supabase session refresh)
```

## Commands

- Use pnpm only.
- Do not lower `minimumReleaseAge` in `pnpm-workspace.yaml`. Only an urgent security fix may go into `minimumReleaseAgeExclude`, one fix at a time (the fixed package and any package that must share its version), and it comes out once the version is 7 days old. Fix a `pnpm audit` failure by updating the package, not by lowering the audit level.
- Update a dependency only for a security fix (a `pnpm audit` failure or a Dependabot alert), a fix or feature the app needs, or a major version leaving support; never on a schedule. Each change updates one package together with the packages that must match it ([Dependency updates](docs/delivery.md#dependency-updates)) and passes the checks below. Once a quarter, check that the major versions of Node, Next.js, React, and Prisma in use are still supported, and plan the move before support ends.
- Verify changes with `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`. CI (`.github/workflows/ci.yml`) runs these pnpm scripts, plus `prisma validate`, a `prisma format` diff check, and `pnpm audit`; add a new check as a pnpm script first.
- Node is pinned in `.nvmrc` and `engines`; change both together. CI passes `.nvmrc` to `NODE_VERSION` in `Dockerfile`, whose default only serves local builds.
- Never hard-code the project name or tool versions in CI or Docker files. Read Node from `.nvmrc` and pnpm from `packageManager`. The exceptions are the Postgres and Redis images, whose tags appear in `ci.yml`, `docker-compose.yaml`, and `docker-compose.test.yaml`; change each image's three together.
- Docker: keep development and service containers in `docker-compose.yaml` and test-only services in `docker-compose.test.yaml`. Never copy `.env` into an image, add per-variable `ARG` / `ENV` lines, or pass secrets as build arguments: the build receives one env file through the BuildKit secret `build-env`, and the runtime receives container environment variables. The image never runs migrations. The app container reads the same `DATABASE_URL` as everything else; never add a second, container-only database variable.
- Multiple instances: start every instance of a deployment from the same image, built with one `NEXT_DEPLOYMENT_ID`; when instances run separate builds, give them one `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`. Keep state instances must share (counters, caches) out of process memory. Give the platform a shutdown grace period of at least 30 seconds after SIGTERM, so in-flight requests and `after()` work finish, and keep instances × `DATABASE_POOL_MAX` within the pooler's client limit.
- Test files are named after the tool that runs them and sit next to the code they cover: `*.vitest.test.ts` or `*.vitest.test.tsx` (`pnpm test:vitest`; a `.tsx` test renders on the server, with no DOM) and `*.playwright.test.ts` (`pnpm test:playwright`). `pnpm test` runs all. A new tool gets its own suffix, script, and `test-utils/<tool>/`.
- Put shared test setup and helpers in `test-utils/<tool>/` instead of repeating them in test files; code both tools need goes in `test-utils/shared/`, which imports no test tool. Vitest already mocks Sentry (`sentryReports()`), `@/lib/notify` (`sentNotifications()`), and `next/headers` globally (`test-utils/vitest/setup.ts`); use `fakeSupabaseAuth()` when a test needs a signed-in user: load the module under test with its `load()`, then `signIn()`.
- Tests never reach a real external service and need no secrets. The database is a real local Postgres and Redis a real local Redis (`docker-compose.test.yaml`, started with `pnpm test:db:up`; CI starts the same images). Keep test services in `docker-compose.test.yaml`, separate from any development compose file; Supabase Auth is the fake server in `test-utils/shared/supabase-auth.ts`; Sentry is mocked or intercepted. Never point tests at the Supabase project.
- Tests run with `.env.test`, never `.env`: Vitest gives it to every test, and Playwright to the app server it builds and starts. It is committed, so it holds no secrets, points only at this machine, and keeps outside services (notifications, Sentry source map upload) off. It lists every variable in `.env.example`, so `.env` fills in none; `test-utils/shared/test-env.vitest.test.ts` checks this.
- Vitest projects: `unit` (no external dependencies, parallel) and `db` (`data/**`, the Prisma and Redis clients, and `test-utils/**` tests, real database and Redis, both emptied before each test, one file at a time). Test `data/` functions against the database, including authorization for another user's resource; tests above `data/` mock the `data/` functions they call. Each test creates its own data. `pnpm test:vitest` and `pnpm test:playwright` fail when the test database or the test Redis is down; `pnpm test:vitest:unit` skips them.
- When you change error mapping, input validation, the error handlers, `lib/auth.ts`, or the ESLint boundary, update the matching Vitest test in the same change. Run Playwright when you change error pages, security headers, page sign-in handling, or Sentry setup.
- Pages that exist only for Playwright go in `app/playwright/` as `page.playwright.tsx`; never give them a plain `page.tsx` name, or they ship to production.
- Database: `pnpm db:generate` / `db:migrate` / `db:deploy` / `db:studio`

## Rules

### Server / client boundary
- Folders group code by feature, not by runtime. The runtime boundary is enforced per module: a server-only module starts with `import "server-only"`, a client-only module with `import "client-only"`. Shared modules import neither and must not import a guarded module. Names such as `*.server.ts` or `lib/server/` are hints, not guards.
- Domain code both sides use (problem types, input schemas a form and its Server Action share, constants) goes in `domains/<domain>/`, which imports no server-only module (enforced by ESLint), so client code can import any of it. Server logic for a domain stays in `data/`.
- Add the guard to every new module that reads server secrets, touches the database, uses `next/headers` / `next/server`, or depends on browser-only APIs.
- Prisma Client values (`@/prisma/client`) are imported only in `data/**`, `lib/db.ts` (and its own test, `lib/db.vitest.test.ts`), and `lib/server/**` (enforced by ESLint). Elsewhere use `import type`, and `@/prisma/browser` for `Decimal`, enums, and `JsonNull`.

### Security boundary (client → server)
Every Server Action and Route Handler is a public endpoint that anyone can call with any input, whether or not the UI uses it. Prisma bypasses RLS, so the server code is the only line of defense.

- **Data access layer**: only `data/**` imports `@/lib/db` (and the module's own test, `lib/db.vitest.test.ts`) and `@/lib/redis/client` (enforced by ESLint), and server secrets (`@/config/env.server`) are read only in `data/**` and server-only `lib/` modules (and the module's own test, `config/env.server.vitest.test.ts`, which loads it with test values). Every `data/` function authenticates with `@/lib/auth`, authorizes the requester against the specific resource (ownership, tenant, role), and then queries.
- **Identity**: get the requester only from `getCurrentUser()` / `requireUser()` in `@/lib/auth`. Supabase Auth calls on the request path run under `createAuthDeadline()` (`@/lib/supabase/auth-deadline`); give a new Auth call on the request path the same limit, and pass the deadline's `fetch` only to a Supabase client used for nothing but auth, since it limits every call that client makes. Never trust a user ID, role, or tenant ID sent by the client, and never use Supabase `getSession()` for auth decisions. `requireUser()` rejects Supabase anonymous users; pass `allowAnonymous: true` only where anonymous use is intended.
- **Lint boundary**: the ESLint boundary matches restricted modules by the end of the path (aliased or relative), also rejects dynamic `import()` / `require()` of them, and covers `.js` files. In `data/`, use `db` only as `db.<model>` / `db.$...`; never rename, return, pass on, or export it. Never bypass it with `eslint-disable`.
- **Return values**: `data/` functions return DTOs with only the fields the caller needs, never raw Prisma records. The same applies to Server Action return values and props passed to Client Components; everything there is serialized to the browser.
- **Mass assignment**: never pass client input straight into Prisma `data` / `where`. Validate with a `.strict()` zod schema and build the Prisma arguments field by field.
- **Server Actions**: a `"use server"` file exports only actions. Each action validates its arguments, then calls `data/`; it never queries the database itself. Do not capture secrets in actions defined inside components.
- **Pages**: Server Components read through `data/` as well. A page that requires sign-in calls `requirePageUser()` (redirects to `SIGN_IN_PATH`), never `requireUser()`. Call each `data/` function through `loadForPage()` from `@/lib/server/error-handlers`: a 404 or 403 becomes `notFound()`, so a forbidden resource's existence is not revealed, and a 401 redirects to sign-in. The proxy only refreshes sessions and protects nothing.
- **Error pages**: `app/error.tsx` and `app/global-error.tsx` never render the error message, only the digest. Do not add a root `loading.tsx`: it streams every page, and `redirect()` / `notFound()` then answer 200 instead of 307 / 404. Add `loading.tsx` per route segment instead.
- **Rate limiting**: there is none yet; Supabase Auth limits its own endpoints. Before releasing an endpoint that repeated calls can abuse (sends email or SMS, posts a notification, calls a paid API, creates data, accepts anonymous callers), limit it in the Server Action or Route Handler before calling `data/`. Key the limit by the requester's user ID, or the client IP for anonymous callers, keep the counters in a store every server instance shares (never process memory), and answer an exceeded limit with a 429 `ProblemError`.
- **Security headers**: keep the headers in `next.config.ts` on every route. Relax a single directive for the route that needs it instead of removing a header. The CSP is built in `lib/csp.ts`; pages get a per-request nonce from the proxy, so they always render dynamically. Content loads only from this origin, and connections go only to this origin, Supabase, and Sentry; add a new external origin to the one directive that needs it. Never add `'unsafe-inline'` to `script-src`; give a new inline or third-party script the nonce from the `x-nonce` request header.

Audit checklist for any change that adds or edits an endpoint:
1. Which `data/` function does it reach, and does that function authenticate and authorize for this exact resource?
2. Is every input (body, search params, FormData, route params, action arguments) validated with a strict schema?
3. Can a client-controlled value select another user's or tenant's data?
4. Does the response, action result, or Client Component prop contain more than the UI needs?
5. Can repeated calls cause cost or abuse, and if so, is the endpoint rate-limited?

The `endpoint-review` skill runs this checklist over a change or the whole app.

### Environment variables
- Never read `process.env` directly. Add public variables to the zod schema in `config/env.ts` and server-only variables to `config/env.server.ts`, then use them from there. The only exceptions are build-time values outside app code: `CI` and `PLAYWRIGHT` in `next.config.ts` and the `SENTRY_*` build variables read by the Sentry plugin, `NEXT_OUTPUT_STANDALONE` in `next.config.ts` (set only by `Dockerfile`), `NODE_ENV`, which Next.js sets and inlines at build time, and `NEXT_DEPLOYMENT_ID` / `NEXT_SERVER_ACTIONS_ENCRYPTION_KEY`, which Next.js reads during the build (set them in `build-env`).
- Never expose secrets as `NEXT_PUBLIC_*`.
- Add every new variable to `.env.example` with a description, and to `.env.test` with a test value, or empty to leave it unset.

### Database
- Put models and enums in `prisma/models/<domain>.prisma`, and nothing else there. Keep `generator` / `datasource` only in `prisma/schema.prisma`.
- Query only inside the data access layer (`data/**`), through `db` from `@/lib/db`. Do not create new Prisma Client instances.
- Outside development, `lib/db.ts` rewrites the Prisma error of every query so its message, stack, and `meta` carry no query values; the class and `code` stay for error mapping. Do not remove it, and never log a query's arguments or a database error's original text yourself.
- Import generated types from `@/prisma/client`, and enum values used in client code from `@/prisma/browser`. Do not edit `app/generated/` by hand.
- The runtime connects with `DATABASE_URL` (transaction pooler); the CLI connects with `DIRECT_URL` (session pooler).
- Change the schema only through Prisma migrations. `pnpm test:vitest` fails when the schema has changes that no migration in `prisma/migrations` covers. Applying them to production (`db:deploy`) is not part of the build.
- Prisma bypasses RLS, so enforce authorization in server code.
- Data API exposure and automatic RLS are Supabase project settings, not migrations (see [Supabase project settings](docs/data-layer.md#supabase-project-settings)). Do not grant `anon` / `authenticated` or disable RLS on a table unless it is meant to be reached through the Data API; when it is, add the grants and policies in a migration.
- Primary keys: `id String @id @default(uuid(7)) @db.Uuid`, and foreign keys referencing them as `String @db.Uuid`. Never use `autoincrement()` IDs (guessable). The UUID is generated by Prisma Client, not the database, so any insert outside Prisma must supply `id`; never add a `gen_random_uuid()` (v4) default.
- Users: store the Supabase user ID (from `requireUser()`) as a `String @db.Uuid` column named `userId`, or `<role>UserId` when a model holds more than one, with an index, without a foreign key or relation to `auth.users`. Clean up a deleted user's rows in app code.
- Model conventions: snake_case names through `@@map` / `@map`, `DateTime` as `@db.Timestamptz`, `Decimal` for fractional values, and an index that starts with every foreign key column: an explicit `@@index`, or a `@unique` / `@@unique` / `@@id` the model already has (a one-to-one relation needs `@unique`). Never add an `@@index` whose columns another index already starts with. `Float` is approximate, so use it only where an approximate value is enough, with a `///` comment on the field saying why.
- `prisma/models.vitest.test.ts` checks these model rules and the pinned Prisma versions; fix a model rather than the test.
- Pin `prisma`, `@prisma/client`, and `@prisma/adapter-pg` to the same exact version.

### Redis
- Redis is the app's cache, on the premise that nothing in it is permanent: any key can disappear at any time. Use it for data the app can rebuild from its source (the database or an outside service) or can afford to lose; data that must last belongs in the database. Redis is optional, so the app runs without `REDIS_URL`.
- Run Redis with a memory limit and `maxmemory-policy allkeys-lru`, so when memory is full it drops keys it has seen least recently used (an approximation), whatever they are, to make room instead of refusing writes. A write can still fail, like any Redis command, and is handled as such.
- Use Redis only in the data access layer (`data/**`), through `getRedis()` from `@/lib/redis/client` (enforced by ESLint). The data access layer rules apply to it as to the database: authenticate, authorize the requester against the resource, return DTOs. Each `data/` function decides what happens when Redis is absent or fails.
- Define each kind of key in its own file, `redis/models/<name>.ts`, as `export const <Name>Model = defineRedisModel("<name>")`, or with `{ value }` for a structured value. Build keys only with `model.key()`, pass `model.writeOptions()` to every `SET`, and check structured values with its schema. Keys do not expire by default; a write gives a TTL (`model.writeOptions(seconds)`) only where an expiry means something. `lib/redis/model-files.vitest.test.ts` checks the files.
- Never run commands that scan or clear the whole server (`KEYS`, `FLUSHALL`, `FLUSHDB`) in app code.

### Server endpoints
- Wrap every exported Route Handler in `withRouteErrorHandler()` and every exported Server Action in `withActionErrorHandler()` (both from `@/lib/server/error-handlers`), as `export const NAME = with...(...)`; ESLint rejects any other export from a `"use server"` file except types, and any other HTTP method, default, or export-all export from a `route.ts`. Route Handlers return their own `Response` on success. Do not hand-roll `try`/`catch` error responses.
- Map errors to Problems only in `@/lib/server/error-mapper`. Expected failures become Problems and are not reported. In Route Handlers, unexpected errors become a 500 Problem, are reported to Sentry, and carry the event ID as `errorId`. Server Actions rethrow unexpected errors, so `onRequestError` reports them and `error.tsx` shows the digest. Do not call `Sentry.captureException` for errors that already flow through the error handlers.

### Observability
- Sentry setup lives in `lib/sentry/`: `options.ts` (the init options every runtime shares), `server.ts` (Node / Edge, plus the server-only filters), `client.ts` (browser). The root `instrumentation.ts` / `instrumentation-client.ts` only load these (and re-export `onRequestError` from `lib/server/request-errors.ts`), because Next.js looks for them at the root. Keep data collection minimal (no user info, cookies, headers, bodies, query parameters); enabling more needs a stated reason.
- Write server logs only through `logger` from `@/lib/server/logger`, never `console` directly. Each line is one JSON object with OpenTelemetry field names, read by whatever collector the deployment uses; never send logs from the app to a log store. Keep `body` a fixed message and put values in attributes. Never log request bodies, headers, cookies, tokens, query strings, or personal data; secret-looking keys are redacted, but that is a backstop. Unexpected errors are already logged by the error mapping and `onRequestError`; do not log them again.
- `/api/health` stays a cheap liveness check: no database, no external calls, no internal state in the response.
- Validate all external input (JSON body, search params, FormData, route params, action arguments) with zod through `@/lib/server/validation` before using it. An invalid route param means not found: `parseParams()` throws a 404 Problem in Route Handlers, and `parsePageParams()` calls `notFound()` in pages.
- Failures are RFC 9457 Problems (`@/lib/problem`). Signal expected failures by throwing `ProblemError`: pass a status number for status-only failures, or a domain problem type.
- Define domain problem types in `domains/<domain>/` with `defineProblemType()` and a kebab-case name, never in `lib/problem.ts`, so the client can import them and compare `type` values. Never rename a released type.
- Status rules: client input validation 400, conflict with current state 409, valid input that breaks a business rule 422, missing target 404, auth 401/403, rate limit exceeded 429.
- `detail` and extension members reach the client, so keep internal details out of them. Clients branch on `type` only, never on `title` or `detail`.
- Server Actions return expected failures in `ActionResult`; forms handle only those. Never rely on a thrown error's message reaching the client.
- The error handlers do not authenticate. Authentication and authorization happen in the `data/` functions each handler and action calls.
- On the client, read failures with `getProblem()` from `@/lib/ky` (Route Handlers) or `ActionResult.problem` (Server Actions).

### Notifications
- Send chat notifications only through `notify()` from `@/lib/notify`, with a kind of notification and its data; never name a service or channel. Call it from a Server Action or Route Handler once the `data/` call has succeeded; ESLint rejects importing `notify` anywhere else. Delivery is best effort, so never use it for anything that must not be lost.
- Define each kind in its own file, `notifications/<name>.ts`, as `export const <Name> = defineNotification("<name>", ...)`. Its data is a flat DTO with only the fields the message needs (`NotificationData`), never a Prisma record. `lib/notify/notification-files.vitest.test.ts` checks the files.
- A notification leaves the app: never put personal data, tokens, request bodies, or internal error details in it; link to the resource instead.
- Do not notify unexpected errors; Sentry reports them.
- Add a chat service as a provider in `lib/notify/providers/` and a destination as a server variable in `config/env.server.ts`. Never post to a webhook from anywhere else.

### Data fetching
- Make HTTP calls through `lib/ky.ts`, which never retries by default. In client code, TanStack Query (`lib/query-client.ts`) owns the retry policy; server code that calls an outside service sets its own retry on that call, and retries a POST only where a repeat is harmless (such as a 429).
- Data the server can read directly is read in Server Components through `data/` functions, not fetched again from the client.

### UI
- `components/ui/` is shadcn registry source, and so are the files the shadcn CLI adds outside it with a component: `hooks/use-mobile.ts`, `hooks/use-highlighted-code.ts`, and `lib/highlighter.tsx`. Never edit these files; shadcn updates overwrite them. When `shadcn add` writes a new file outside `components/ui/`, add it to this list and to the structure tree. Give project hooks and modules names of their own.
- When you need a variation, create a derived component in `components/shared/`. Import from `@/components/ui/*` and wrap it (default props, className, extra cva variants, composition) instead of copying and modifying the source file.
- Put components used by a single route in that route's `_components/`.
- `app/globals.css` is managed by shadcn. Never edit it; put project styles (theme token overrides, extra tokens, `@utility`, base styles) in `app/shared.css`, which `globals.css` imports last.
- Add: `pnpm dlx shadcn@latest add <component>`
- Update: review the changes with `pnpm dlx shadcn@latest add <component> --diff`, then apply them with `--overwrite`. Derived components wrap the source, so check that they still work after an update.
- Merge classes with `import { cn } from "cn"`.
- Every component in `components/ui/` and `components/shared/` appears in the `/design-system` showcase: use it in a card in `app/(design-system)/components/cards/` and register the card in `showcase.tsx`. Route-only `_components/` and providers are not included. `showcase.vitest.test.ts` fails when a component or card is missing.

### Documentation
- Before changing a file listed in a `docs/` page's key files table, read that page. `pnpm docs:affected` lists the pages for the current changes.
- The `docs-review` and `docs-write` skills carry the procedures for reviewing and writing docs; use them for docs work.
- Rules for a single business domain go in the `## Domain rules` section of its page in `docs/domains/`, not here; this file keeps the rules every domain shares.
- After such a change, check the page and update it in the same change if it no longer matches.
- Write and edit `docs/` by "Writing these docs" in `docs/README.md`.
- Keep the structure tree above complete: every top-level folder and every entry directly in `lib/`. `docs/docs.vitest.test.ts` fails on a missing or stale entry, a broken link, a mismatched index table, or an environment variable missing from `.env.example` or the README table.
