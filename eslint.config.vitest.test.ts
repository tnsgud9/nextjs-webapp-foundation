import path from "node:path";
import { ESLint } from "eslint";
import { beforeAll, describe, expect, it } from "vitest";

/**
 * Regression tests for the server resource boundary in eslint.config.mjs (DAL, Prisma, server secrets), the
 * entry point exports, and where notify() may be called.
 * Each snippet is linted as if it were a file at the given path to check whether it is blocked.
 */
const root = import.meta.dirname;
const eslint = new ESLint({ cwd: root });
const BOUNDARY_RULES = new Set([
  "@typescript-eslint/no-restricted-imports",
  "project/dynamic-imports",
  "project/db-usage",
  "project/entry-exports",
  "project/notify-imports",
]);

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
    ["server env in a config test other than its own", "config/env.vitest.test.ts", 'export const x = () => import("./env.server");\n'],
  ])("blocks %s", async (_name, file, code) => {
    expect(await violations(file, code)).toBeGreaterThan(0);
  });

  it("lets only the server env module's own test load it", async () => {
    expect(await violations("config/env.server.vitest.test.ts", 'export const x = () => import("./env.server");\n')).toBe(0);
    expect(await violations("config/env.server.vitest.test.ts", DYNAMIC_DB)).toBeGreaterThan(0);
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

describe("Redis (through the data access layer)", () => {
  const REDIS_CLIENT = 'import { getRedis } from "@/lib/redis/client";\nexport const x = getRedis;\n';
  const REDIS_PACKAGE = 'import { createClient } from "redis";\nexport const x = createClient;\n';
  const MODEL = 'import { defineRedisModel } from "@/lib/redis/model";\nexport const x = defineRedisModel;\n';

  it.each(["components/probe.ts", "app/probe/route.ts", "lib/probe.ts", "lib/server/probe.ts", "redis/models/probe.ts"])(
    "%s may not use the Redis client or the Redis package",
    async (file) => {
      expect(await violations(file, REDIS_CLIENT)).toBeGreaterThan(0);
      expect(await violations(file, REDIS_PACKAGE)).toBeGreaterThan(0);
      expect(await violations(file, 'export const x = () => import("@/lib/redis/client");\n')).toBeGreaterThan(0);
      expect(await violations(file, 'export const x = () => import("@redis/client");\n')).toBeGreaterThan(0);
    },
  );

  it("data/ uses the Redis client and Redis models beside the database, but not the package", async () => {
    expect(await violations("data/probe.ts", REDIS_CLIENT)).toBe(0);
    expect(await violations("data/probe.ts", 'export const x = () => import("@/lib/redis/client");\n')).toBe(0);
    expect(await violations("data/probe.ts", 'import { ImportProgressModel } from "@/redis/models/import-progress";\nexport const x = ImportProgressModel;\n')).toBe(0);
    expect(await violations("data/probe.ts", QUERY)).toBe(0);
    expect(await violations("data/probe.ts", REDIS_PACKAGE)).toBeGreaterThan(0);
    expect(await violations("data/probe.ts", 'export const x = () => import("@redis/client");\n')).toBeGreaterThan(0);
  });

  it("lib/redis/ holds the package; model files define Redis models without the client", async () => {
    expect(await violations("lib/redis/client.ts", REDIS_PACKAGE)).toBe(0);
    expect(await violations("redis/models/probe.ts", MODEL)).toBe(0);
  });

  it("only the test Redis helpers use the package outside lib/redis/", async () => {
    expect(await violations("test-utils/shared/test-redis.ts", REDIS_PACKAGE)).toBe(0);
    expect(await violations("test-utils/vitest/probe.ts", REDIS_PACKAGE)).toBeGreaterThan(0);
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

describe("notifications (call sites)", () => {
  const NOTIFY = 'import { notify } from "@/lib/notify";\nexport const send = () => notify;\n';

  it("allow notify() in a Route Handler", async () => {
    expect(await violations("app/api/probe/route.ts", NOTIFY)).toBe(0);
  });

  it('allow notify() in a "use server" file', async () => {
    const ACTION =
      '"use server";\nimport { notify } from "@/lib/notify";\nimport { withActionErrorHandler } from "@/lib/server/error-handlers";\n' +
      "export const save = withActionErrorHandler(async () => ({ ok: true as const, sent: typeof notify }));\n";
    expect(await violations("app/probe/actions.ts", ACTION)).toBe(0);
  });

  it.each([
    "components/probe.tsx",
    "app/probe/page.tsx",
    "app/probe/helpers.ts",
    "data/probe.ts",
    "lib/probe.ts",
    "notifications/probe.ts",
  ])("block notify() in %s", async (file) => {
    expect(await violations(file, NOTIFY)).toBeGreaterThan(0);
  });

  it.each([
    ["a relative import", 'import { notify } from "../lib/notify";\nexport const send = () => notify;\n'],
    ["a renamed import", 'import { notify as send } from "@/lib/notify";\nexport const x = send;\n'],
    ["a string-named import", 'import { "notify" as send } from "@/lib/notify";\nexport const x = send;\n'],
    ["a string-named sendNotification()", 'import { "sendNotification" as send } from "@/lib/notify";\nexport const x = send;\n'],
    ["a namespace import", 'import * as notifications from "@/lib/notify";\nexport const x = notifications;\n'],
    ["a dynamic import", 'export const x = () => import("@/lib/notify");\n'],
    ["a require", 'const { notify } = require("@/lib/notify");\nmodule.exports = notify;\n'],
    ["a re-export", 'export { notify } from "@/lib/notify";\n'],
    ["a template literal import", "export const x = () => import(`@/lib/notify`);\n"],
    ["a template literal require", "const { notify } = require(`@/lib/notify`);\nmodule.exports = notify;\n"],
    ["sendNotification()", 'import { sendNotification } from "@/lib/notify";\nexport const x = sendNotification;\n'],
  ])("block %s outside entry points", async (_name, code) => {
    expect(await violations("data/probe.ts", code)).toBeGreaterThan(0);
  });

  it.each([
    ["lib/probe.ts", 'import { notify } from "./notify";\nexport const send = () => notify;\n'],
    ["lib/server/probe.ts", 'import { notify } from "../notify/index";\nexport const send = () => notify;\n'],
  ])("block a relative import that does not pass through lib/ (%s)", async (file, code) => {
    expect(await violations(file, code)).toBeGreaterThan(0);
  });

  it.each([
    ["sendNotification()", 'import { sendNotification } from "@/lib/notify";\nexport type X = typeof sendNotification;\n'],
    ["a namespace import", 'import * as notifications from "@/lib/notify";\nexport type X = typeof notifications;\n'],
    ["a dynamic import", "export type X = Awaited<ReturnType<typeof load>>;\nconst load = () => import(\"@/lib/notify\");\n"],
    ["a re-export", 'export { notify } from "@/lib/notify";\n'],
  ])("block %s in entry points too", async (_name, code) => {
    expect(await violations("app/probe/actions.ts", `"use server";\n${code}`)).toBeGreaterThan(0);
    expect(await violations("app/api/probe/route.ts", code)).toBeGreaterThan(0);
  });

  it.each([
    ["the notifier", 'import { createNotifier } from "@/lib/notify/notifier";\nexport const x = createNotifier;\n'],
    ["a provider", 'import { createSlackProvider } from "@/lib/notify/providers/slack";\nexport const x = createSlackProvider;\n'],
    ["kind.ts", 'import { defineNotification } from "@/lib/notify/kind";\nexport const x = defineNotification;\n'],
    ["a relative internal file", 'import { createNotifier } from "./notify/notifier";\nexport const x = createNotifier;\n'],
    ["a dynamic import of an internal file", 'export const x = () => import("@/lib/notify/notifier");\n'],
  ])("block importing %s of the module", async (_name, code) => {
    expect(await violations("lib/probe.ts", code)).toBeGreaterThan(0);
    expect(await violations("app/api/probe/route.ts", code)).toBeGreaterThan(0);
  });

  it("allow types from the module's own files, and the module itself through its index", async () => {
    expect(await violations("data/probe.ts", 'import type { NotifyProvider } from "@/lib/notify/types";\nexport type X = NotifyProvider;\n')).toBe(0);
    expect(await violations("data/probe.ts", 'import { type NotifyProvider } from "@/lib/notify/types";\nexport type X = NotifyProvider;\n')).toBe(0);
    expect(await violations("app/api/probe/route.ts", 'import { notify } from "@/lib/notify/index";\nexport const x = notify;\n')).toBe(0);
  });

  it("allow defining kinds and importing types anywhere", async () => {
    const KIND =
      'import "server-only";\nimport { defineNotification } from "@/lib/notify";\n' +
      'export const ProbeDone = defineNotification("probe-done", { topic: "ops", render: () => ({ title: "Done" }) });\n';
    const TYPES = 'import type { NotificationData } from "@/lib/notify";\nexport type X = NotificationData<{ a: string }>;\n';
    expect(await violations("notifications/probe-done.ts", KIND)).toBe(0);
    expect(await violations("data/probe.ts", TYPES)).toBe(0);
    expect(await violations("data/probe.ts", TYPES.replace("import type {", "import {"))).toBe(0);
    expect(await violations("data/probe.ts", 'export type { NotificationData } from "@/lib/notify";\n')).toBe(0);
    expect(await violations("data/probe.ts", 'export { type NotifyProvider } from "@/lib/notify/types";\n')).toBe(0);
  });
});
