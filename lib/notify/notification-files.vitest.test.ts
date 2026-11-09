import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * Checks the files in `notifications/`, one per kind of notification. Until the first kind is added,
 * only the checks on sample files below run.
 */
const DIR = "notifications";

const pascalCase = (kebab: string) => kebab.replace(/(^|-)([a-z0-9])/g, (_, __, char: string) => char.toUpperCase());

/** What breaks the one-kind-per-file layout in a file named `file` with this source. */
function violations(file: string, source: string): string[] {
  const name = file.replace(/\.ts$/, "");
  const found: string[] = [];
  if (!/^[a-z0-9]+(-[a-z0-9]+)*\.ts$/.test(file)) found.push("the file name must be kebab-case .ts");
  if (!/^import "server-only";/.test(source.trimStart())) found.push('the file must start with import "server-only"');
  const kinds = [...source.matchAll(/export const (\w+) = defineNotification(?:<[^>]*>)?\(\s*"([^"]*)"/g)];
  if ((source.match(/defineNotification\(|defineNotification</g) ?? []).length !== 1 || kinds.length !== 1) {
    found.push("the file must export exactly one kind as `export const Name = defineNotification(\"name\", …)`");
  } else {
    const [, exported, kindName] = kinds[0];
    if (kindName !== name) found.push(`the kind name must match the file name: "${name}"`);
    if (exported !== pascalCase(name)) found.push(`the export must be named ${pascalCase(name)}`);
  }
  return found;
}

const VALID = `import "server-only";
import { defineNotification } from "@/lib/notify";

export interface ImportFinishedData {
  rows: number;
}

export const ImportFinished = defineNotification("import-finished", {
  topic: "ops",
  render: (data: ImportFinishedData) => ({ title: "Import finished" }),
});
`;

describe("notification kind files", () => {
  const files = existsSync(DIR) ? readdirSync(DIR).filter((file) => file.endsWith(".ts") && !file.includes(".test.")) : [];

  if (files.length > 0) {
    it.each(files)("%s holds one kind named after the file", (file) => {
      expect(violations(file, readFileSync(join(DIR, file), "utf8"))).toEqual([]);
    });
  }

  it("accept a file with one kind named after it", () => {
    expect(violations("import-finished.ts", VALID)).toEqual([]);
  });

  it.each([
    ["importFinished.ts", VALID, "kebab-case"],
    ["import-finished.ts", VALID.replace('import "server-only";\n', ""), "server-only"],
    ["import-finished.ts", VALID.replace('"import-finished"', '"import-done"'), "match the file name"],
    ["import-finished.ts", VALID.replace("const ImportFinished", "const Finished"), "named ImportFinished"],
    ["import-finished.ts", `${VALID}\nexport const Other = defineNotification("other", { topic: "ops", render: () => ({ title: "x" }) });\n`, "exactly one"],
    ["import-finished.ts", VALID.replace("export const ImportFinished", "const ImportFinished"), "exactly one"],
  ])("reject %s that breaks the layout (%#)", (file, source, message) => {
    expect(violations(file, source).join("\n")).toContain(message);
  });
});
