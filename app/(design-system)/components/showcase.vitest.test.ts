import { readdirSync, readFileSync } from "node:fs";
import { basename, join } from "node:path";
import { describe, expect, it } from "vitest";

/**
 * The showcase must show every shared component: everything in `components/ui/` and
 * `components/shared/` is imported by a card, and every card is registered in `showcase.tsx`.
 * Route-only `_components/` and providers are out of scope.
 */
const SHOWCASE_DIR = "app/(design-system)";
const CARDS_DIR = join(SHOWCASE_DIR, "components", "cards");

const sourceFiles = (dir: string) =>
  readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((file) => file.replaceAll("\\", "/"))
    .filter((file) => file.endsWith(".tsx") && !file.includes(".test."));

const showcaseSource = sourceFiles(SHOWCASE_DIR)
  .map((file) => readFileSync(join(SHOWCASE_DIR, file), "utf8"))
  .join("\n");

const missingFrom = (dir: string, alias: string) =>
  sourceFiles(dir)
    .map((file) => `${alias}/${file.replace(/\.tsx$/, "")}`)
    .filter((module) => !showcaseSource.includes(`"${module}"`));

describe("design system showcase", () => {
  it("imports every component in components/ui/", () => {
    expect(missingFrom("components/ui", "@/components/ui")).toEqual([]);
  });

  it("imports every component in components/shared/", () => {
    expect(missingFrom("components/shared", "@/components/shared")).toEqual([]);
  });

  it("registers every card in the showcase", () => {
    const showcase = readFileSync(join(SHOWCASE_DIR, "components", "showcase.tsx"), "utf8");
    const unregistered = sourceFiles(CARDS_DIR)
      .map((file) => basename(file, ".tsx"))
      .filter((card) => !showcase.includes(`"@/app/(design-system)/components/cards/${card}"`));
    expect(unregistered).toEqual([]);
  });
});
