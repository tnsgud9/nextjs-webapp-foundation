---
name: docs-review
description: Check that docs/ pages, AGENTS.md, and the README still describe the code after a change, and that the docs text follows the writing rules in docs/README.md. Use before committing a change to a docs page or to a file a docs page lists as a key file, or when asked to review the docs. Reports findings and edits nothing.
---

# Docs review

Find statements in the docs that no longer match the code, and docs text that breaks the writing rules. This is a review: report, never edit. The rules are in "Writing these docs" in `docs/README.md`; read that section in full first and judge by it, without restating it.

## Input

The change to review: uncommitted changes by default, or the changes since a base commit the request names. When the request asks for a full review, every page in `docs/`.

## Steps

1. Run `pnpm docs:affected`, with the base commit as its argument when there is one. It lists the pages to re-check, the changed files that touch each, and the changed files no page lists. Add the docs pages the change edits itself.
2. Match against the code. For each page from step 1, read the page, then the diff of its changed files and the code the page describes. Check every statement the change can affect: names, behavior, values (time limits, statuses, field names, defaults), the steps in each diagram, and the roles in the key files table.
3. Check the writing rules. For each page the change edits, read the changed text against each rule in "Writing these docs" that the docs test cannot check:
   - a rule from AGENTS.md restated instead of linked, or its reason given in more than one clause;
   - code blocks other than Mermaid, and sample code in prose;
   - names: a specific service or vendor, a package or tool version, or a business domain name outside `docs/domains/`;
   - code referred to by a link instead of its path in backticks, and links to anything but these pages, AGENTS.md, and external specifications;
   - a concept under a term other than the one the rules fix;
   - plans written as facts, and wording that calls the project a template or a starter;
   - Mermaid: a node named after a file, or one diagram answering more than one question;
   - headings that are not noun phrases, or a purpose longer than two lines;
   - domain pages: what the page must cover, and `## Domain rules` placed before Key files.
4. For each changed file no page lists, decide whether a page should list it: it should when it carries a flow or a rule a page explains. Route-only components, tests, tooling, and small helpers need no entry.
5. When the change touches the subject of an AGENTS.md rule, check that rule and the AGENTS.md structure tree. When it touches environment variables or setup, check the README.
6. When the change adds, removes, or rewords a rule in AGENTS.md, in the `## Domain rules` section of a domain page, or in "Writing these docs" in `docs/README.md`, list each such rule at the top of the report, quoting the old and new wording. A rule change needs a person's decision, so flag it even when it looks right.
7. Run `pnpm test:vitest:unit docs` and report any failure as it is. Do not re-check by hand what that test already checks: page length and shape, key files that exist, index tables, links, Mermaid types, styling, and node counts, the structure tree, environment variable lists, and the skill folders.

## Report

Rule changes first, as step 6 describes. Then one entry per finding, most serious first:
- Where: `page:line`, quoting the statement.
- What is wrong: what the code does instead, with `file:line`, or the writing rule it breaks, named by its heading in "Writing these docs".
- Kind: outdated, missing, writing rule, or a file no page lists that should be listed.

End with the pages checked and the result of the docs test. Say "No findings" when there are none. Never call a page correct without having read the code it describes; if something cannot be decided from the repository, say so.
