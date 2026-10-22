import { execFileSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join, matchesGlob } from "node:path";

/**
 * Reads the key files tables of the docs pages. `pnpm docs:affected [base]` runs this file and lists
 * the pages whose key files differ from `base` (default `HEAD`, so uncommitted and untracked changes),
 * and the changed files that no page lists. `docs/docs.vitest.test.ts` uses the same parsing.
 */
export const readMarkdown = (file: string) => readFileSync(file, "utf8").replaceAll("\r\n", "\n");

/** The lines of the `##` section with this heading, up to the next `##` heading. */
export function section(markdown: string, heading: string): string[] {
  const lines = markdown.split("\n");
  const start = lines.indexOf(`## ${heading}`);
  if (start < 0) return [];
  const end = lines.findIndex((line, index) => index > start && line.startsWith("## "));
  return lines.slice(start + 1, end < 0 ? undefined : end);
}

/** Table body rows (header and divider rows dropped) in these lines. */
export const tableRows = (lines: string[]) => lines.filter((line) => line.startsWith("|")).slice(2);
export const firstCell = (row: string) => row.split("|")[1] ?? "";
export const codeSpans = (text: string) => [...text.matchAll(/`([^`]+)`/g)].map((match) => match[1]!);

/** The paths, folders (ending in `/`), and globs in the page's key files table. */
export const keyFiles = (markdown: string) =>
  tableRows(section(markdown, "Key files")).flatMap((row) => codeSpans(firstCell(row)));

/** Topic and domain pages: every Markdown file in docs/ and docs/domains/ except the index. */
export function docsPages(): string[] {
  const markdownIn = (dir: string) =>
    existsSync(dir)
      ? readdirSync(dir)
          .filter((file) => file.endsWith(".md") && file !== "README.md")
          .map((file) => join(dir, file).replaceAll("\\", "/"))
      : [];
  return [...markdownIn("docs"), ...markdownIn("docs/domains")];
}

/** Whether a key files entry names this file: the same path, a folder holding it, or a matching glob. */
export function covers(entry: string, file: string): boolean {
  if (entry.endsWith("/")) return file.startsWith(entry);
  if (entry.includes("*")) return matchesGlob(file, entry);
  return file === entry;
}

/** Test files and Markdown are never key files, so they are left out of the unlisted files. */
const neverListed = (file: string) => /\.(vitest|playwright)\.test\.|\.md$/.test(file);

export function affectedPages(pages: Record<string, string[]>, changed: string[]) {
  const affected = Object.entries(pages)
    .map(([page, entries]) => ({
      page,
      files: changed.filter((file) => entries.some((entry) => covers(entry, file))),
    }))
    .filter(({ files }) => files.length > 0);
  const listed = new Set(affected.flatMap(({ files }) => files));
  const unlisted = changed.filter((file) => !listed.has(file) && !neverListed(file));
  return { affected, unlisted };
}

if (import.meta.main) {
  const base = process.argv[2] ?? "HEAD";
  const git = (...args: string[]) => execFileSync("git", args, { encoding: "utf8" }).split("\n").filter(Boolean);
  const changed = [
    ...new Set([...git("diff", "--name-only", base), ...git("ls-files", "--others", "--exclude-standard")]),
  ].toSorted();
  const pages = Object.fromEntries(docsPages().map((page) => [page, keyFiles(readMarkdown(page))]));
  const { affected, unlisted } = affectedPages(pages, changed);

  console.log(affected.length > 0 ? "Pages to re-check:" : "No docs page lists a changed file.");
  for (const { page, files } of affected) console.log(`  ${page}\n${files.map((file) => `    ${file}`).join("\n")}`);
  if (unlisted.length > 0) console.log(`Changed files no page lists:\n${unlisted.map((file) => `  ${file}`).join("\n")}`);
}
