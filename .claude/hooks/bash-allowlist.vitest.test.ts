import { spawnSync } from "node:child_process";
import { describe, expect, it } from "vitest";

const HOOK = ".claude/hooks/bash-allowlist.mjs";

/** The hook's exit code for this input; 2 blocks the call. */
const exitCode = (input: string) => spawnSync(process.execPath, [HOOK], { input }).status;
const run = (command?: string) => exitCode(JSON.stringify({ tool_input: { command } }));

describe("subagent Bash allowlist", () => {
  it("lets the read-only git commands through", () => {
    for (const command of [
      "git diff --name-only HEAD~2",
      "git log --format='%h %s' -5",
      "git show HEAD:AGENTS.md",
      "git status --short",
      "git log --oneline -5",
      "git ls-files lib",
    ]) {
      expect(run(command)).toBe(0);
    }
  });

  it("lets the docs commands through", () => {
    expect(run("pnpm docs:affected")).toBe(0);
    expect(run("pnpm docs:affected HEAD~3")).toBe(0);
    expect(run("pnpm test:vitest:unit docs")).toBe(0);
  });

  it("blocks commands that write, change state, or run anything else", () => {
    for (const command of [
      "git commit -m x",
      "git checkout -- lib/auth.ts",
      "git diff --output=lib/auth.ts",
      "git log -oout.txt",
      'git diff --o"utput=lib/auth.ts"',
      "git log --outp''ut=x",
      "git diff '--output=x'",
      "git diff --outp=lib/auth.ts",
      "git diff --out=lib/auth.ts",
      "git diff --{output,stat}=lib/auth.ts",
      "pnpm test:vitest:unit",
      "pnpm docs:affected HEAD extra",
      "pnpm docs:affected --output=x",
      "pnpm docs:affected -oout.txt",
      "pnpm install",
      "node -e 1",
      "rm -rf docs",
      "sed -i s/a/b/ lib/auth.ts",
    ]) {
      expect(run(command)).toBe(2);
    }
  });

  it("blocks chaining, redirection, and substitution", () => {
    for (const command of [
      "git status; rm -rf lib",
      "git status && touch x",
      "git diff | tee lib/x.ts",
      "git diff > lib/x.ts",
      "git log $(touch x)",
      "git log `touch x`",
      "git status\ntouch x",
    ]) {
      expect(run(command)).toBe(2);
    }
  });

  it("blocks a call it cannot read", () => {
    expect(run()).toBe(2);
    expect(exitCode("not json")).toBe(2);
  });
});
