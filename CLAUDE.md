@AGENTS.md

# Claude Code

## Skills

Load the project skills in `.claude/skills/` before working on the related task.

- `prisma-cli` — Prisma CLI (generate, migrate, studio)
- `prisma-client-api` — Prisma Client queries
- `supabase-postgres-best-practices` — schema, index, connection, and RLS design. Apply changes through the Prisma schema.
- `docs-review`, `docs-write` — reviewing and writing `docs/`, AGENTS.md, and the README by the writing rules in `docs/README.md`
- `endpoint-review` — the security boundary review of entry points and `data/` functions

Keep `.claude/skills/` and `.agents/skills/` identical.

## Subagents

The subagents in `.claude/agents/` run the project skills in a context of their own, without the conversation or the user's global instructions. They rely only on this repository, so a review does not lean on the work it checks.

- `docs-writer` — runs `docs-write`. Use it to bring the docs in line after a change, to add a topic or domain page, or to fix review findings. Tell it why the code changed; it cannot see the conversation. It edits only the Markdown in `docs/`, AGENTS.md, and README.md, and proposes rule changes, including to the writing rules, instead of making them.
- `docs-reviewer` (read-only) — runs `docs-review`: whether the docs match the code and follow the writing rules. Use it after `docs-writer`, and before committing a change that `pnpm docs:affected` maps to a page.
- `endpoint-reviewer` (read-only) — runs `endpoint-review`: what lint and tests cannot judge at the security boundary. Use it when a change adds or edits an entry point or a `data/` function, and before a release.

Hooks in `.claude/hooks/` enforce these limits: `docs-writer-scope.mjs` blocks edits outside those Markdown files, and `bash-allowlist.mjs` lets every subagent run only read-only commands. Hooks from the user's own settings still run inside subagents; only turning off all hooks for the session stops them.
