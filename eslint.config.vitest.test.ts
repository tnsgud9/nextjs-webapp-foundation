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

describe("entry points", () => {
  const HANDLERS = 'import { withActionErrorHandler, withRouteErrorHandler } from "@/lib/server/error-handlers";\n';
  const ACTION = `"use server";\n${HANDLERS}export const save = withActionErrorHandler(async () => ({ ok: true as const }));\n`;
  const ROUTE = `${HANDLERS}export const dynamic = "force-dynamic";\nexport const GET = withRouteErrorHandler(async () => Response.json({}));\n`;

  it.each(["app/probe/actions.ts", "components/probe-actions.ts", "lib/probe-actions.ts", "data/probe-actions.ts"])(
    "allow Server Actions wrapped in withActionErrorHandler in %s",
    async (file) => {
      expect(await violations(file, ACTION)).toBe(0);
      expect(await violations(file, `${ACTION}export type Saved = { ok: true };\n`)).toBe(0);
    },
  );

  it.each([
    ["a plain async function", '"use server";\nexport async function save() {}\n'],
    ["an unwrapped arrow function", '"use server";\nexport const save = async () => {};\n'],
    ["a different wrapper", `"use server";\n${HANDLERS}export const save = withRouteErrorHandler(async () => Response.json({}));\n`],
    ["a default export", `"use server";\n${HANDLERS}export default withActionErrorHandler(async () => ({ ok: true as const }));\n`],
    ["an alias", '"use server";\nconst save = async () => {};\nexport { save };\n'],
    ["a re-export", '"use server";\nexport { save } from "./other";\n'],
    ["export all", '"use server";\nexport * from "./other";\n'],
  ])("block %s in a \"use server\" file", async (_name, code) => {
    expect(await violations("app/probe/actions.ts", code)).toBeGreaterThan(0);
    expect(await violations("data/probe-actions.ts", code)).toBeGreaterThan(0);
  });

  it("leave files without \"use server\" alone", async () => {
    expect(await violations("app/probe/helpers.ts", "export async function save() {}\n")).toBe(0);
  });

  it("allow Route Handlers wrapped in withRouteErrorHandler, and route config exports", async () => {
    expect(await violations("app/api/probe/route.ts", ROUTE)).toBe(0);
  });

  it.each([
    ["a plain function", "export async function GET() {\n  return Response.json({});\n}\n"],
    ["an unwrapped arrow function", "export const POST = async () => Response.json({});\n"],
    ["a different wrapper", `${HANDLERS}export const PUT = withActionErrorHandler(async () => ({ ok: true as const }));\n`],
    ["an alias", "const handler = async () => Response.json({});\nexport { handler as DELETE };\n"],
    ["a re-export", 'export { GET } from "./other";\n'],
    ["export all", 'export * from "./other";\n'],
    ["a default export", "export default async function handler() {\n  return Response.json({});\n}\n"],
  ])("block %s as a Route Handler", async (_name, code) => {
    expect(await violations("app/api/probe/route.ts", code)).toBeGreaterThan(0);
  });

  it("keep the server boundary in route files", async () => {
    expect(await violations("app/api/probe/route.ts", DB)).toBeGreaterThan(0);
    expect(await violations("app/api/probe/route.ts", DYNAMIC_DB)).toBeGreaterThan(0);
  });
});
