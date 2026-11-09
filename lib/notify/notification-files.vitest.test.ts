import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { definitionFileViolations, definitionFiles } from "@/test-utils/vitest/definition-files";

/**
 * Checks the files in `notifications/`, one per kind of notification. Until the first kind is added,
 * only the checks on sample files below run.
 */
const DIR = "notifications";
const violations = (file: string, source: string) => definitionFileViolations(file, source, { define: "defineNotification" });

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
  const files = definitionFiles(DIR);

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
