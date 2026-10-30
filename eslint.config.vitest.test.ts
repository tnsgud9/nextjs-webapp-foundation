import path from "node:path";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Regression tests for the server resource boundary in eslint.config.mjs (DAL, Prisma, server secrets).
 * Each snippet is linted as if it were a file at the given path to check whether it is blocked.
 */
const root = import.meta.dirname;
const eslint = new ESLint({ cwd: root });
const BOUNDARY_RULES = new Set(["@typescript-eslint/no-restricted-imports", "no-restricted-syntax"]);

// The first lint takes seconds to load the config and plugins and can exceed a single test's 5-second
// timeout on a cold disk cache, so it is warmed up here with a longer timeout.
beforeAll(async () => {
  await eslint.lintText("", { filePath: path.join(root, "probe.ts"), warnIgnored: true });
}, 60_000);

async function violations(file: string, code: string): Promise<number> {
  const [result] = await eslint.lintText(code, { filePath: path.join(root, file), warnIgnored: true });
  expect(result.messages.filter((message) => message.fatal), `${file} must parse`).toEqual([]);
  return result.messages.filter((message) => message.ruleId && BOUNDARY_RULES.has(message.ruleId)).length;
}

const DB = 'import { db } from "@/lib/db";\nexport const x = db;\n';
const PRISMA_VALUE = 'import { Prisma } from "@/prisma/client";\nexport const x = Prisma;\n';
const PRISMA_TYPE = 'import type { Prisma } from "@/prisma/client";\nexport type X = Prisma.PrismaClientOptions;\n';
const PRISMA_BROWSER = 'import { Prisma } from "@/prisma/browser";\nexport const d = Prisma.Decimal;\n';
const SERVER_ENV = 'import { serverEnv } from "@/config/env.server";\nexport const x = serverEnv;\n';
const DYNAMIC_DB = 'export const x = () => import("@/lib/db");\n';
const QUERY = 'import { db } from "@/lib/db";\nexport const count = () => db.$queryRaw`select 1`;\n';

describe.each(["components/probe.ts", "app/probe/page.tsx", "hooks/probe.ts", "probe.ts"])("default path %s", (file) => {
  it("blocks the database, Prisma values, and server env", async () => {
    expect(await violations(file, DB)).toBeGreaterThan(0);
    expect(await violations(file, PRISMA_VALUE)).toBeGreaterThan(0);
    expect(await violations(file, SERVER_ENV)).toBeGreaterThan(0);
  });

  it("allows Prisma types and the browser build", async () => {
    expect(await violations(file, PRISMA_TYPE)).toBe(0);
    expect(await violations(file, PRISMA_BROWSER)).toBe(0);
  });
});

describe("bypass attempts outside data/", () => {
  it.each([
    ["JS file", "components/probe.js", DB],
    ["JSX file with a relative path", "components/probe.jsx", 'import { db } from "../lib/db";\nexport const x = db;\n'],
    ["CommonJS require", "components/probe.cjs", 'const { db } = require("@/lib/db");\nmodule.exports = db;\n'],
    ["dynamic import of db", "components/probe.ts", DYNAMIC_DB],
    ["dynamic import of server env", "components/probe.ts", 'export const x = () => import("@/config/env.server");\n'],
    ["dynamic import of Prisma Client", "components/probe.ts", 'export const x = () => import("../app/generated/prisma/client");\n'],
    ["dynamic import of db from lib/", "lib/probe.ts", DYNAMIC_DB],
    ["dynamic import of db from lib/server/", "lib/server/probe.ts", DYNAMIC_DB],
    ["template literal import of db", "components/probe.ts", "export const x = () => import(`@/lib/db`);\n"],
    ["relative import of db from lib/", "lib/probe.ts", 'import { db } from "./db";\nexport const x = db;\n'],
    ["relative import of db from lib/server/", "lib/server/probe.ts", 'import { db } from "../db";\nexport const x = db;\n'],
    ["a generated Prisma module other than client", "components/probe.ts", 'import { getPrismaClientClass } from "@/prisma/internal/class";\nexport const x = getPrismaClientClass;\n'],
    ["relative import of server env", "config/probe.ts", 'import { serverEnv } from "./env.server";\nexport const x = serverEnv;\n'],
  ])("blocks %s", async (_name, file, code) => {
    expect(await violations(file, code)).toBeGreaterThan(0);
  });
});

describe("lib/", () => {
  it("blocks the database and Prisma values but allows server env", async () => {
    expect(await violations("lib/probe.ts", DB)).toBeGreaterThan(0);
    expect(await violations("lib/probe.ts", PRISMA_VALUE)).toBeGreaterThan(0);
    expect(await violations("lib/probe.ts", SERVER_ENV)).toBe(0);
  });

  it("lib/server/ may use Prisma values but not the database", async () => {
    expect(await violations("lib/server/probe.ts", PRISMA_VALUE)).toBe(0);
    expect(await violations("lib/server/probe.ts", DB)).toBeGreaterThan(0);
  });
});

describe("data/ (data access layer)", () => {
  it("may query through db and use Prisma values", async () => {
    expect(await violations("data/probe.ts", QUERY)).toBe(0);
    expect(await violations("data/probe.ts", PRISMA_VALUE)).toBe(0);
    expect(await violations("data/probe.ts", DYNAMIC_DB)).toBe(0);
  });

  it.each([
    ["export from", 'export { db } from "@/lib/db";\n'],
    ["export all", 'export * from "@/lib/db";\n'],
    ["local re-export", 'import { db } from "@/lib/db";\nexport { db };\n'],
    ["default export", 'import { db } from "@/lib/db";\nexport default db;\n'],
    ["export under another name", DB],
    ["return from a function", 'import { db } from "@/lib/db";\nexport function getDb() {\n  return db;\n}\n'],
    ["renamed import", 'import { db as d } from "@/lib/db";\nexport { d };\n'],
    ["namespace import", 'import * as m from "@/lib/db";\nexport const x = m;\n'],
  ])("never hands out db (%s)", async (_name, code) => {
    expect(await violations("data/probe.ts", code)).toBeGreaterThan(0);
  });
});
