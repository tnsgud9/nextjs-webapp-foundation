import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const HOOK = ".claude/hooks/docs-writer-scope.mjs";
const ROOT = process.cwd();

/** The hook's exit code for this input; 2 blocks the call. */
const exitCode = (input: string) =>
  spawnSync(process.execPath, [HOOK], { input, env: { ...process.env, CLAUDE_PROJECT_DIR: ROOT } }).status;
const edit = (file_path?: string) => exitCode(JSON.stringify({ tool_input: { file_path } }));

describe("docs-writer edit scope", () => {
  it("lets edits to Markdown in docs/, AGENTS.md, and README.md through, by absolute or relative path", () => {
    for (const path of ["docs/auth.md", "docs/domains/x.md", "AGENTS.md", "README.md"]) {
      expect(edit(path)).toBe(0);
      expect(edit(join(ROOT, path))).toBe(0);
    }
  });

  it("blocks edits anywhere else", () => {
    for (const path of [
      "lib/auth.ts",
      "CLAUDE.md",
      "docs.md",
      "docs/docs.vitest.test.ts",
      "docs/key-files.mts",
      "docs/notes.txt",
      "docs/../lib/auth.ts",
      "../README.md",
      join(ROOT, "lib", "auth.ts"),
      join(ROOT, "..", "AGENTS.md"),
      ".claude/skills/docs-write/SKILL.md",
    ]) {
      expect(edit(path)).toBe(2);
    }
  });

  it("blocks a call it cannot read", () => {
    expect(edit()).toBe(2);
    expect(exitCode("not json")).toBe(2);
  });
});
