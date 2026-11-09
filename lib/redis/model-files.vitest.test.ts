import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { definitionFileViolations, definitionFiles } from "@/test-utils/vitest/definition-files";

/**
 * Checks the files in `redis/models/`, one per Redis model. Until the first model is added, only
 * the checks on sample files below run.
 */
const DIR = "redis/models";
const violations = (file: string, source: string) =>
  definitionFileViolations(file, source, { define: "defineRedisModel", exportSuffix: "Model" });

const VALID = `import "server-only";
import { z } from "zod";
import { defineRedisModel } from "@/lib/redis/model";

export const ImportProgressModel = defineRedisModel("import-progress", {
  value: z.object({ done: z.number(), total: z.number() }),
});
`;

describe("Redis model files", () => {
  const files = definitionFiles(DIR);

  if (files.length > 0) {
    it.each(files)("%s holds one model named after the file", (file) => {
      expect(violations(file, readFileSync(join(DIR, file), "utf8"))).toEqual([]);
    });
  }

  it("accept a file with one model named after it", () => {
    expect(violations("import-progress.ts", VALID)).toEqual([]);
  });

  it.each([
    ["import_progress.ts", VALID, "kebab-case"],
    ["import-progress.ts", VALID.replace('import "server-only";\n', ""), "server-only"],
    ["import-progress.ts", VALID.replace('"import-progress"', '"progress"'), "match the file name"],
    ["import-progress.ts", VALID.replace("const ImportProgressModel", "const ImportProgress"), "named ImportProgressModel"],
    ["import-progress.ts", VALID.replace("export const", "const"), "exactly one"],
  ])("reject %s that breaks the layout (%#)", (file, source, message) => {
    expect(violations(file, source).join("\n")).toContain(message);
  });
});
