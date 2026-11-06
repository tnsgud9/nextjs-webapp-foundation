import { readFileSync } from "node:fs";

/**
 * PreToolUse hook for the Bash tool of the project subagents. Lets through only their read-only
 * commands and blocks everything else with exit code 2. Any other exit code would let the call
 * through, so input it cannot read is blocked too.
 *
 * Allowed: git diff, log, show, status, and ls-files, without an option that writes a file;
 * pnpm docs:affected, with an optional base commit that is not an option; and the docs test.
 */
const GIT_READ = new Set(["diff", "log", "show", "status", "ls-files"]);
/** Shell syntax that chains, redirects, substitutes, or expands; a command with any of it is blocked. */
const SHELL_SYNTAX = /[;&|<>`$\\{}\n\r]/;

/**
 * Whether a git argument writes a file: `-o…`, or `--output` or any abbreviation of it git would accept
 * (`--outp=x`). The shell joins quoted pieces into one word, so quotes are removed before the check.
 */
function writesFile(arg) {
  const word = arg.replaceAll(/["']/g, "");
  const name = word.split("=")[0];
  return word.startsWith("-o") || name.startsWith("--output") || (name.length >= 4 && "--output".startsWith(name));
}

function allowed(command) {
  if (SHELL_SYNTAX.test(command)) return false;
  const [tool, sub, ...rest] = command.trim().split(/\s+/);
  if (tool === "git" && sub !== undefined && GIT_READ.has(sub)) return !rest.some(writesFile);
  if (tool !== "pnpm") return false;
  if (sub === "docs:affected") return rest.length === 0 || (rest.length === 1 && /^[\w./~^@][\w./~^@-]*$/.test(rest[0]));
  return sub === "test:vitest:unit" && rest.length === 1 && rest[0] === "docs";
}

let command = "";
try {
  command = JSON.parse(readFileSync(0, "utf8")).tool_input?.command ?? "";
} catch {
  command = "";
}

if (typeof command !== "string" || !allowed(command)) {
  process.stderr.write(`This subagent runs only its read-only commands; blocked: ${command}\n`);
  process.exit(2);
}
