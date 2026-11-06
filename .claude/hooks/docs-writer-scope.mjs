import { readFileSync } from "node:fs";
import { isAbsolute, relative, resolve, sep } from "node:path";

/**
 * PreToolUse hook for the Edit and Write tools of the docs-writer subagent. Lets through only edits
 * to Markdown files in docs/ and to AGENTS.md and README.md at the project root, and blocks
 * everything else with exit code 2, including the docs test and tooling in docs/. Any other exit
 * code would let the call through, so input it cannot read is blocked too.
 */
const root = process.env.CLAUDE_PROJECT_DIR || process.cwd();

let path = "";
try {
  path = JSON.parse(readFileSync(0, "utf8")).tool_input?.file_path ?? "";
} catch {
  path = "";
}

const inScope = (file) => {
  if (typeof file !== "string" || file === "") return false;
  const rel = relative(root, resolve(root, file)).split(sep).join("/");
  if (rel === "" || rel.startsWith("../") || rel === ".." || isAbsolute(rel)) return false;
  return rel === "AGENTS.md" || rel === "README.md" || (rel.startsWith("docs/") && rel.endsWith(".md"));
};

if (!inScope(path)) {
  process.stderr.write(`docs-writer edits only Markdown in docs/, AGENTS.md, and README.md; blocked: ${path}\n`);
  process.exit(2);
}
