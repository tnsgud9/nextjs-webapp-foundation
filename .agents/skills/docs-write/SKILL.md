---
name: docs-write
description: Write or update docs/ pages, the AGENTS.md structure tree and docs pointers, and the README by the project's docs rules. Use when a change needs a docs update, when adding a topic page or a domain page, or when fixing docs review findings. Edits only the Markdown in docs/, AGENTS.md, and README.md, and only proposes rule changes.
---

# Docs writing

Bring the docs in line with the code. "Writing these docs" in `docs/README.md` is the only copy of the writing rules: read it in full before writing, and follow it.

## Scope

Edit only the Markdown files in `docs/`, `AGENTS.md`, and `README.md`. Never change code to match the docs, and never touch the docs test or tooling in `docs/`. When the code looks wrong rather than the docs, leave both as they are and report it.

Rules are a person's decision. Never add, remove, or reword one, even when a page or the code suggests it; propose the change in the report instead, with its reason. This covers:
- AGENTS.md, where you edit only the structure tree and the lines that point to docs pages;
- the `## Domain rules` section of a domain page;
- "Writing these docs" in `docs/README.md`, the rules you write by.

## Steps

1. Find what to update.
   - For a change: run `pnpm docs:affected`, with a base commit as its argument when the request names one.
   - For a new topic: extend an existing page first; add a page only for a new topic, or when a page would pass its length limit.
   - For a new business domain: the domain page in `docs/domains/`, by "Domain pages" in `docs/README.md`.
   - For review findings: each finding's page and line.
2. Read the code before writing about it, and describe it as it is now. State what exists and what is still missing; never describe plans as facts.
3. Put each thing in its one place.
   - A rule every domain shares goes in AGENTS.md; a rule for one domain goes in the `## Domain rules` section of its page.
   - How and why something works goes in a docs page, which links the rule instead of restating it.
   - Setup steps and the environment variable table go in the README.
4. Update what goes with the change, in the same change:
   - the key files table of each page whose files moved, appeared, or changed role;
   - both index tables, with the same wording, when a topic page is added or renamed;
   - the AGENTS.md structure tree for a new top-level folder or a new entry directly in `lib/`;
   - the README environment variable table, when a variable changes. The schema and `.env.example` are code: when they do not match the README, report it instead of editing them.
5. Verify.
   - Run `pnpm test:vitest:unit docs` and fix what it reports.
   - Re-read the diff for code blocks other than Mermaid, sample code, names of hosting services or other vendors outside the project's stack, and wording that calls the project a template or a starter.

## Report

List the files changed and, for each, what now matches the code. Then list the proposed rule changes, each with the rule, the new wording, and the reason. Last, list anything left undone and why, including code that looks wrong.
