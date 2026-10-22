import { execFileSync } from "node:child_process";
import { existsSync, globSync, readdirSync, statSync } from "node:fs";
import { dirname, join, normalize } from "node:path";
import { describe, expect, it } from "vitest";
import {
  affectedPages,
  codeSpans,
  covers,
  firstCell,
  keyFiles,
  readMarkdown as read,
  section,
  tableRows,
} from "./key-files.mjs";

/**
 * Keeps docs/, README.md, and AGENTS.md in step with the code, by the rules in "Writing these docs"
 * (docs/README.md). It checks what a machine can check; whether the prose still matches the code is
 * left to review.
 */
const DOCS_DIR = "docs";
const pages = readdirSync(DOCS_DIR).filter((file) => file.endsWith(".md"));
const topicPages = pages.filter((page) => page !== "README.md");
const MARKDOWN_FILES = [...pages.map((page) => join(DOCS_DIR, page)), "README.md", "AGENTS.md"];

/** Key files that a command creates later, so they may be missing until then. */
const CREATED_LATER = new Set(["prisma/migrations/"]);

/** Text outside fenced code blocks. */
const prose = (markdown: string) => markdown.replace(/^```[\s\S]*?^```/gm, "");

const pathExists = (path: string) => (path.includes("*") ? globSync(path).length > 0 : existsSync(path));

/** GitHub's heading anchor: lower case, punctuation dropped, spaces as hyphens. */
const slug = (heading: string) =>
  heading
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s_-]/gu, "")
    .replace(/\s/g, "-");

const anchors = (file: string) =>
  new Set(
    prose(read(file))
      .split("\n")
      .filter((line) => /^#{1,6} /.test(line))
      .map((line) => slug(line.replace(/^#+ /, ""))),
  );

describe("docs pages", () => {
  it.each(pages)("%s stays under 150 lines", (page) => {
    expect(read(join(DOCS_DIR, page)).trimEnd().split("\n").length).toBeLessThanOrEqual(150);
  });

  it.each(topicPages)("%s has a title and ends with Key files, then Related rules", (page) => {
    const markdown = read(join(DOCS_DIR, page));
    expect(markdown.startsWith("# ")).toBe(true);
    const headings = prose(markdown)
      .split("\n")
      .filter((line) => line.startsWith("## "));
    expect(headings.slice(-2)).toEqual(["## Key files", "## Related rules"]);
  });

  it.each(topicPages)("%s lists key files that exist", (page) => {
    const paths = keyFiles(read(join(DOCS_DIR, page)));
    expect(paths.length).toBeGreaterThan(0);
    expect(paths.filter((path) => !CREATED_LATER.has(path) && !pathExists(path))).toEqual([]);
  });

  it("are all listed in both index tables, with the same wording", () => {
    const indexLines = read(join(DOCS_DIR, "README.md")).split("\n");
    const docsIndex = tableRows(indexLines.slice(0, indexLines.findIndex((line) => line.startsWith("## "))));
    const readmeIndex = tableRows(section(read("README.md"), "Documentation")).map((row) =>
      row.replaceAll("](docs/", "]("),
    );
    expect(readmeIndex).toEqual(docsIndex);
    const listed = docsIndex.map((row) => /\]\(([^)]+)\)/.exec(row)?.[1]);
    expect(listed.toSorted()).toEqual(topicPages.toSorted());
  });
});

describe("pages affected by a change (pnpm docs:affected)", () => {
  it("match a key file by its path, a folder holding it, or a glob", () => {
    expect(covers("lib/auth.ts", "lib/auth.ts")).toBe(true);
    expect(covers("lib/auth.ts", "lib/auth.tsx")).toBe(false);
    expect(covers("lib/sentry/", "lib/sentry/options.ts")).toBe(true);
    expect(covers("lib/sentry/", "lib/sentry.ts")).toBe(false);
    expect(covers("lib/server/*.vitest.test.ts", "lib/server/logger.vitest.test.ts")).toBe(true);
    expect(covers("lib/server/*.vitest.test.ts", "lib/server/logger.ts")).toBe(false);
  });

  it("list each page with its changed files, and the changed files no page lists", () => {
    const pages = { "docs/a.md": ["lib/a.ts", "lib/shared/"], "docs/b.md": ["lib/b.ts"] };
    const changed = ["lib/a.ts", "lib/shared/x.ts", "lib/new.ts", "lib/new.vitest.test.ts", "docs/a.md"];
    expect(affectedPages(pages, changed)).toEqual({
      affected: [{ page: "docs/a.md", files: ["lib/a.ts", "lib/shared/x.ts"] }],
      unlisted: ["lib/new.ts"],
    });
  });

  it("read the key files of the real pages", () => {
    const pages = Object.fromEntries(topicPages.map((page) => [page, keyFiles(read(join(DOCS_DIR, page)))]));
    expect(affectedPages(pages, ["lib/auth.ts"]).affected.map(({ page }) => page)).toContain("auth.md");
  });
});

describe("Mermaid diagrams", () => {
  const ALLOWED = /^(flowchart|sequenceDiagram|stateDiagram)\b/;
  const KEYWORDS = new Set(["subgraph", "end", "direction", "TD", "TB", "LR", "RL", "BT"]);

  /** Boxes, decisions, states, and sequence participants. */
  function nodes(diagram: string): Set<string> {
    const [type = "", ...body] = diagram.trim().split("\n");
    if (type.startsWith("sequenceDiagram")) {
      return new Set(
        body.flatMap((line) => {
          const declared = /^\s*(?:participant|actor)\s+(\w+)/.exec(line);
          if (declared) return [declared[1]!];
          const message = /^\s*(\w+)\s*[-=.x)>]+\s*[+-]?(\w+)\s*:/.exec(line);
          return message ? [message[1]!, message[2]!] : [];
        }),
      );
    }
    return new Set(
      body.flatMap((line) =>
        (line
          .replace(/"[^"]*"/g, "")
          .replace(/\|[^|]*\|/g, "")
          .replace(/\[[^\]]*\]|\{[^}]*\}|\([^)]*\)/g, "")
          .replace(/:.*$/, "")
          .match(/\b[A-Za-z_]\w*\b/g) ?? []
        ).filter((word) => !KEYWORDS.has(word)),
      ),
    );
  }

  const diagrams = MARKDOWN_FILES.flatMap((file) =>
    [...read(file).matchAll(/^```mermaid\n([\s\S]*?)^```/gm)].map((match, index) => ({
      name: `${file} #${index + 1}`,
      diagram: match[1]!,
    })),
  );

  it.each(diagrams)("$name uses an allowed type, no styling, and at most 15 nodes", ({ diagram }) => {
    expect(diagram.trim()).toMatch(ALLOWED);
    expect(diagram).not.toMatch(/^\s*(style|classDef|class|linkStyle)\b|%%\{|:::/m);
    expect(nodes(diagram).size).toBeLessThanOrEqual(15);
  });
});

describe("links", () => {
  it.each(MARKDOWN_FILES)("%s links only to files and headings that exist", (file) => {
    const broken = [...prose(read(file)).matchAll(/\]\(([^)\s]+)\)/g)]
      .map((match) => match[1]!)
      .filter((target) => !/^[a-z]+:/.test(target))
      .filter((target) => {
        const [path = "", anchor] = target.split("#");
        const resolved = path ? normalize(join(dirname(file), path)) : file;
        if (!existsSync(resolved)) return true;
        if (anchor === undefined || statSync(resolved).isDirectory()) return false;
        return !anchors(resolved).has(anchor);
      });
    expect(broken).toEqual([]);
  });
});

describe("AGENTS.md structure tree", () => {
  const tree = /^## Structure\n\n```\n([\s\S]*?)^```/m.exec(read("AGENTS.md"))?.[1] ?? "";
  const entries: string[] = [];
  let parent = "";
  for (const line of tree.split("\n").filter(Boolean)) {
    const [, branch, name = ""] = /^(├── |└── )?(\S+)/.exec(line) ?? [];
    if (branch) entries.push(parent + name);
    else {
      entries.push(name);
      parent = name.endsWith("/") ? name : "";
    }
  }
  const tracked = execFileSync("git", ["ls-files"], { encoding: "utf8" }).split("\n").filter(Boolean);

  it("lists only paths that exist", () => {
    expect(entries.length).toBeGreaterThan(0);
    expect(entries.filter((entry) => !entry.includes("**") && !pathExists(entry))).toEqual([]);
  });

  it("lists every top-level folder", () => {
    const folders = new Set(
      tracked.filter((file) => file.includes("/") && !file.startsWith(".")).map((file) => `${file.split("/")[0]}/`),
    );
    expect([...folders].filter((folder) => !entries.includes(folder))).toEqual([]);
  });

  it("lists every module and folder directly in lib/", () => {
    const libEntries = new Set(
      tracked
        .filter((file) => file.startsWith("lib/") && !file.includes(".vitest.test."))
        .map((file) => {
          const [, name, rest] = file.split("/");
          return `lib/${name}${rest === undefined ? "" : "/"}`;
        }),
    );
    expect([...libEntries].filter((entry) => !entries.includes(entry))).toEqual([]);
  });
});

describe("environment variables", () => {
  const keys = (text: string, pattern: RegExp) => [...text.matchAll(pattern)].map((match) => match[1]!);
  const schemaKeys = ["config/env.ts", "config/env.server.ts"].flatMap((file) =>
    keys(read(file), /^ {2}([A-Z][A-Z0-9_]+): z\./gm),
  );
  const exampleKeys = keys(read(".env.example"), /^([A-Z][A-Z0-9_]+)=/gm);
  const readmeKeys = tableRows(section(read("README.md"), "Environment variables"))
    .flatMap((row) => codeSpans(firstCell(row)))
    .filter((key) => /^[A-Z][A-Z0-9_]+$/.test(key));

  it("are all in .env.example", () => {
    expect(schemaKeys.length).toBeGreaterThan(0);
    expect(schemaKeys.filter((key) => !exampleKeys.includes(key))).toEqual([]);
  });

  it("in .env.example and the README table match", () => {
    expect(readmeKeys.toSorted()).toEqual(exampleKeys.toSorted());
  });
});

describe("agent skills", () => {
  const files = (dir: string) =>
    readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((file) => statSync(join(dir, file)).isFile())
      .map((file) => file.replaceAll("\\", "/"))
      .toSorted();

  it("are identical in .claude/skills and .agents/skills", () => {
    const claude = files(".claude/skills");
    expect(files(".agents/skills")).toEqual(claude);
    const differing = claude.filter(
      (file) => read(join(".claude/skills", file)) !== read(join(".agents/skills", file)),
    );
    expect(differing).toEqual([]);
  });
});
