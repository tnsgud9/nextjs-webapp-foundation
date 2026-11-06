---
name: endpoint-review
description: Review Server Actions, Route Handlers, pages that read data, and data/ functions against the security boundary rules in AGENTS.md. Use when a change adds or edits an entry point or a data access function, and before a release. Reports findings and edits nothing.
---

# Endpoint review

Every Server Action and Route Handler is a public endpoint, and Prisma bypasses RLS, so the server code is the only defense. This review checks the part of that code no lint rule or test can judge. It reports and never edits.

The rules are in AGENTS.md: "Security boundary (client → server)" with its audit checklist, "Server endpoints", and "Observability". Read those sections first and judge by them, without restating them.

## Scope

- By default, the changed files: uncommitted changes, or the changes since a base commit the request names.
- For a full review, every `route.ts`, every file that starts with `"use server"`, every page that reads data, and everything in `data/`.
- Include the code they reach: `lib/auth.ts`, `lib/server/`, `proxy.ts`, and the `data/` functions they call.
- When there are no entry points or `data/` functions in scope, say so and stop.

What lint and tests already enforce is out of scope: the import boundary around `db`, Prisma values, and server secrets; the error handler wrapping every exported action and Route Handler; and the Prisma model rules. Do not re-check those by hand.

## Steps

1. List the entry points in scope: each Route Handler method, each Server Action, and each page that reads data.
2. Trace each one from the entry to the database and back:
   - input validation, for every input kind it receives;
   - the `data/` function it calls;
   - how that function gets the requester and authorizes them for this exact resource;
   - the Prisma arguments, and which of their values came from the client;
   - what is returned, and what of it reaches the browser.
3. Answer the five questions of the AGENTS.md audit checklist for each entry point, each with `file:line` evidence.
4. Check the rest of those AGENTS.md sections against the traced code:
   - pages and sign-in;
   - not found for a missing or forbidden resource;
   - rate limiting;
   - secrets captured in actions defined inside components;
   - expected failures as Problems, and their status codes;
   - what reaches the logs and the error reports.
5. Check that each `data/` function has a database test, including a request for another user's resource.

## Report

First a table: one row per entry point, one column per checklist question, each cell pass, fail, or unclear. A pass needs evidence; without it the cell is unclear.

Then the findings, ranked:
1. Another user's data can be read or changed now.
2. Must be fixed before release.
3. Improvement.

Each finding gives the entry point, the rule it breaks, `file:line`, and how a caller could exploit it. Say so when a question cannot be answered from the repository.
