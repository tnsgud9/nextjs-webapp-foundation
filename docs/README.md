# Documentation

How the app works, with a diagram for each part. The rules live in [AGENTS.md](../AGENTS.md); these pages explain the structure behind them.

| Page | Covers |
| --- | --- |
| [Architecture](architecture.md) | Layers, the server/client boundary, client-side data, UI components |
| [Request flow](request-flow.md) | The proxy, security headers and CSP, page responses for sign-in, not found, and errors |
| [Auth](auth.md) | Requester identity and session refresh |
| [Data layer](data-layer.md) | The data access layer for the database and Redis, database connections, schema, migrations, model conventions |
| [Redis](redis.md) | Optional Redis as the app's cache: nothing permanent, eviction, the client, Redis models and their keys, Redis in the data access layer, running without Redis |
| [Errors](errors.md) | Problems, error handlers, client error handling, Sentry, the health check |
| [Logging](logging.md) | Structured server logs, request IDs, what is never logged, log collection |
| [Notifications](notifications.md) | Server notifications to a chat service: kinds of notification, topics and destinations, providers, best-effort delivery |
| [Testing](testing.md) | Test tools, the test environment, the test database, the fake Auth server, shared helpers |
| [Delivery](delivery.md) | CI, supply chain, dependency updates, environment variables, the Docker image, Compose, multiple instances |
| [Coding agents](agents.md) | Instruction files, skills, subagents, hooks, machine checks, the docs and endpoint review flows |

## Domains

Each business domain gets its own page in `docs/domains/`, listed here in a `Page | Covers` table. There are no domain pages yet.

## Writing these docs

### Page shape
Every page has these parts, in this order:
1. A `#` title, then one or two lines of purpose, with no heading of their own.
2. Topic sections with `##` noun-phrase headings. A section may open with a sentence, then a diagram, then the explanation the diagram needs.
3. `## Key files`: a `File | Role` table.
4. `## Related rules`: one bullet per AGENTS.md section, as a link followed by a colon and the sub-rules or topics it covers.

### Content
- **Explain how and why; leave the rules in AGENTS.md.** When a rule matters to a flow, give its reason in at most one clause and link the rule instead of restating it.
- **Keep it short.** A page stays under 150 lines.
- **No sample code.** Use prose, tables, and diagrams. Mermaid blocks are the only code blocks.
- **Describe the code as it is.** Do not call the project a template or a starter; state what exists and what is still missing.
- **Names.** Use the names of the project's own stack (the tools in `package.json` and its config files). Never use the name of a specific service. Business domain names appear only in domain pages. Leave out package and tool version numbers; specification identifiers such as RFC 9457 or UUID v7 are fine.
- **Code references.** Refer to code by its path in backticks, such as `lib/auth.ts`, never as a link. Links go only to other pages here, to AGENTS.md, and to external specifications.
- **Terms.** Use one term per concept across pages: data access layer, entry point, requester, Problem, Client Component, Prisma Client, RLS.

### Domain pages
- One page per domain, `docs/domains/<domain>.md`, named after its `prisma/models/<domain>.prisma`. The pages directly in `docs/` stay free of domain names.
- Same page shape and content rules as the other pages. A domain page covers the domain's models and relations, its state changes, who may read or change each resource at each entry point, its problem types, and its rate-limited endpoints. Its key files table lists `domains/<domain>/` along with `prisma/models/<domain>.prisma` and the domain's `data/` files, so a change to any of them re-checks the page.
- Rules that apply to one domain only go in a `## Domain rules` section before Key files, not in AGENTS.md, which keeps the rules every domain shares. The rule to read a page before changing its key files brings them to whoever edits the domain.

### Mermaid
- Use only `flowchart`, `sequenceDiagram`, and `stateDiagram`.
- Set no colors, themes, styles, or classes, so diagrams read in both light and dark mode.
- One diagram answers one question, with at most 15 nodes. Every box, decision, and sequence participant counts as a node.
- Name nodes by role, such as "Proxy" or "Data access layer". Never use a file name. Use a function name only when the diagram explains that function. The key files table and the text map roles to code.

### Keeping docs current
- A change to a file or folder listed in a page's key files table re-checks that page, and updates it in the same change if it no longer matches. `pnpm docs:affected` lists those pages for the uncommitted changes, or for the changes since a commit given as its argument, and names the changed files that no page lists. The `docs-review` and `docs-write` skills build on it to review and update the pages.
- Extend an existing page first. Add a page only for a new topic, or when a page would pass 150 lines. List a new page in the table above and in the table in the root `README.md`, with the same wording.
- `docs/docs.vitest.test.ts` checks what a machine can: page length and shape, key files that exist, both index tables, links and anchors, Mermaid types, styling, and node counts. It also checks that the AGENTS.md structure tree matches the folders, that environment variables match across their schema, `.env.example`, and the README table, that the two skill folders are identical, and that every skill and subagent exists and is listed in CLAUDE.md. It does not read domain pages yet. Whether the text still matches the code is left to review.
