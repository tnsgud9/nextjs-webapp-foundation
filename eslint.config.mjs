import { defineConfig, globalIgnores } from "eslint/config";
import { builtinRules } from "eslint/use-at-your-own-risk";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

// Modules restricted by the server resource boundary, matched by the end of the import path so
// aliased and relative paths are both caught. `source` is the same match as a regex for dynamic
// import() / require() (it uses `\x2F` instead of `/` because it sits inside an esquery selector).
const RESTRICTED = {
  db: {
    group: ["**/db"],
    source: String.raw`\x2Fdb$`,
    message:
      "Use the database only in the data access layer (data/). Call a data/ function, which authenticates and authorizes.",
  },
  prismaValues: {
    // Every generated Prisma module except the browser build.
    group: ["@/prisma/*", "!@/prisma/browser", "**/generated/prisma/*", "!**/generated/prisma/browser"],
    source: String.raw`(^@|\x2Fgenerated)\x2Fprisma\x2F(?!browser$)`,
    allowTypeImports: true,
    message:
      "Import Prisma Client values only in data/, lib/db.ts, and lib/server/. Use `import type` for types and `@/prisma/browser` for Decimal and enums.",
  },
  serverEnv: {
    group: ["**/env.server"],
    source: String.raw`\x2Fenv\.server$`,
    message: "Read server secrets only in data/ and server-only modules in lib/.",
  },
  // Redis, like the database, is reached only through the data access layer (data/).
  redisClient: {
    group: ["**/redis/client"],
    source: String.raw`\x2Fredis\x2Fclient$`,
    message:
      "Use the Redis client only in the data access layer (data/), with a Redis model from redis/models/. Call a data/ function.",
  },
  redisPackage: {
    regex: "^(redis|@redis/.+)$",
    source: String.raw`^(redis|@redis\x2F.+)$`,
    message: "Import the Redis package only in lib/redis/ (and the test Redis helpers). Call a data/ function.",
  },
};

// Entry points: every exported Server Action and Route Handler goes through its error handler, so the
// Problem mapping and error reporting cannot be skipped. An export the rule cannot see through (a
// plain function, an alias, a re-export) is rejected rather than trusted.
const ACTION_FILE = `Program:has(> ExpressionStatement[directive="use server"])`;
const ACTION_MESSAGE =
  'A "use server" file exports only actions, each as `export const name = withActionErrorHandler(...)` from @/lib/server/error-handlers.';
const ACTION_EXPORTS = [
  {
    selector: `${ACTION_FILE} > ExportNamedDeclaration[exportKind!="type"]:not(:has(> VariableDeclaration))`,
    message: ACTION_MESSAGE,
  },
  {
    selector: `${ACTION_FILE} > ExportNamedDeclaration > VariableDeclaration > VariableDeclarator:not([init.type="CallExpression"][init.callee.name="withActionErrorHandler"])`,
    message: ACTION_MESSAGE,
  },
  { selector: `${ACTION_FILE} > :matches(ExportDefaultDeclaration, ExportAllDeclaration)`, message: ACTION_MESSAGE },
];

const HTTP_METHOD = "/^(GET|HEAD|POST|PUT|PATCH|DELETE|OPTIONS)$/";
const ROUTE_MESSAGE =
  "Export each Route Handler as `export const METHOD = withRouteErrorHandler(...)` from @/lib/server/error-handlers.";
const ROUTE_EXPORTS = [
  { selector: `ExportNamedDeclaration > FunctionDeclaration[id.name=${HTTP_METHOD}]`, message: ROUTE_MESSAGE },
  {
    selector: `ExportNamedDeclaration > VariableDeclaration > VariableDeclarator[id.name=${HTTP_METHOD}]:not([init.type="CallExpression"][init.callee.name="withRouteErrorHandler"])`,
    message: ROUTE_MESSAGE,
  },
  { selector: `ExportSpecifier[exported.name=${HTTP_METHOD}]`, message: ROUTE_MESSAGE },
  { selector: ":matches(ExportDefaultDeclaration, ExportAllDeclaration)", message: ROUTE_MESSAGE },
];

/** Blocks static import / export-from together with dynamic import() / require(), with a string or template literal. */
function restrictImports(...entries) {
  return {
    "@typescript-eslint/no-restricted-imports": [
      "error",
      {
        patterns: entries.map(({ group, regex, allowTypeImports, message }) => ({
          ...(group ? { group } : { regex }),
          allowTypeImports,
          message,
        })),
      },
    ],
    "no-restricted-syntax": [
      "error",
      ...entries.flatMap(({ source, message }) => [
        { selector: `ImportExpression[source.value=/${source}/]`, message },
        { selector: `ImportExpression[source.quasis.0.value.cooked=/${source}/]`, message },
        { selector: `CallExpression[callee.name="require"][arguments.0.value=/${source}/]`, message },
        { selector: `CallExpression[callee.name="require"][arguments.0.quasis.0.value.cooked=/${source}/]`, message },
      ]),
      ...ACTION_EXPORTS,
    ],
  };
}

const ALL_SOURCES = ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"];

// Notifications are sent only from entry points, the places that call data/ and know whether it succeeded.
// App code reaches the module in one way only: `import { notify }` (types and defineNotification aside), and
// only in a "use server" file or a Route Handler. Namespace, default, and dynamic imports, require(),
// re-exports, and sendNotification() (which sends at once, for code outside a request) are rejected in every
// app file. The module is matched by the end of its path, aliased or relative, like the boundary above. The
// selectors run as their own rule (no-restricted-syntax under another name), so the boundary blocks above
// never override them.
const NOTIFY_SOURCE = String.raw`\x2Fnotify(\x2Findex)?$`;
const NOTIFY_IMPORT = `ImportDeclaration[importKind!="type"][source.value=/${NOTIFY_SOURCE}/]`;
const NOTIFY_MESSAGE =
  'Import { notify } from @/lib/notify only in a Server Action ("use server" file) or a Route Handler, and call it once the data/ call has succeeded.';
/** Rejected in every app file, entry points included. */
const NOTIFY_OTHER_ACCESS = [
  `${NOTIFY_IMPORT} > :matches(ImportNamespaceSpecifier, ImportDefaultSpecifier)`,
  `${NOTIFY_IMPORT} > ImportSpecifier[importKind!="type"]:matches([imported.name="sendNotification"], [imported.value="sendNotification"])`,
  `ImportExpression[source.value=/${NOTIFY_SOURCE}/]`,
  `ImportExpression[source.quasis.0.value.cooked=/${NOTIFY_SOURCE}/]`,
  `CallExpression[callee.name="require"][arguments.0.value=/${NOTIFY_SOURCE}/]`,
  `CallExpression[callee.name="require"][arguments.0.quasis.0.value.cooked=/${NOTIFY_SOURCE}/]`,
  `ExportNamedDeclaration[exportKind!="type"][source.value=/${NOTIFY_SOURCE}/]:has(> ExportSpecifier[exportKind!="type"])`,
  `ExportAllDeclaration[exportKind!="type"][source.value=/${NOTIFY_SOURCE}/]`,
].map((selector) => ({ selector, message: NOTIFY_MESSAGE }));
// The module's own files (notifier, providers, kind) would let code build a sender of its own.
const NOTIFY_INTERNALS = String.raw`\x2Fnotify\x2F(?!index$)`;
const INTERNALS_MESSAGE = "Import from @/lib/notify, never from its own files.";
NOTIFY_OTHER_ACCESS.push(
  ...[
    `ImportDeclaration[importKind!="type"][source.value=/${NOTIFY_INTERNALS}/] > :matches(ImportSpecifier[importKind!="type"], ImportDefaultSpecifier, ImportNamespaceSpecifier)`,
    `ImportExpression[source.value=/${NOTIFY_INTERNALS}/]`,
    `ImportExpression[source.quasis.0.value.cooked=/${NOTIFY_INTERNALS}/]`,
    `CallExpression[callee.name="require"][arguments.0.value=/${NOTIFY_INTERNALS}/]`,
    `CallExpression[callee.name="require"][arguments.0.quasis.0.value.cooked=/${NOTIFY_INTERNALS}/]`,
    `ExportNamedDeclaration[exportKind!="type"][source.value=/${NOTIFY_INTERNALS}/]:has(> ExportSpecifier[exportKind!="type"])`,
    `ExportAllDeclaration[exportKind!="type"][source.value=/${NOTIFY_INTERNALS}/]`,
  ].map((selector) => ({ selector, message: INTERNALS_MESSAGE })),
);
/** `import { notify }` outside a "use server" file. */
const NOTIFY_OUTSIDE_ACTIONS = {
  selector: `Program:not(:has(> ExpressionStatement[directive="use server"])) ${NOTIFY_IMPORT} > ImportSpecifier[importKind!="type"]:matches([imported.name="notify"], [imported.value="notify"])`,
  message: NOTIFY_MESSAGE,
};

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Generated Prisma Client (`prisma generate`).
    "app/generated/**",
  ]),
  {
    // Vendored shadcn/ui output. These files are regenerated by the shadcn CLI
    // whenever a component is added or updated, so any inline eslint-disable
    // comment would be overwritten. Keep the exemptions here instead, and keep
    // them narrow so real issues in our own code still surface.
    name: "shadcn/ui generated",
    files: ["components/ui/**", "hooks/use-mobile.ts"],
    rules: {
      "react-hooks/set-state-in-effect": "off",
    },
  },
  // Server resource boundary: the database, Redis, and server secrets are reached only through the
  // data access layer (data/). A later block overrides an earlier one for the
  // same rule, so later blocks cover narrower paths and allow more. JS files are included too
  // (allowJs in tsconfig).
  {
    name: "server boundary: default",
    files: ALL_SOURCES,
    rules: restrictImports(
      RESTRICTED.db,
      RESTRICTED.prismaValues,
      RESTRICTED.serverEnv,
      RESTRICTED.redisClient,
      RESTRICTED.redisPackage,
    ),
  },
  {
    name: "server boundary: lib",
    files: ["lib/**"],
    rules: restrictImports(RESTRICTED.db, RESTRICTED.prismaValues, RESTRICTED.redisClient, RESTRICTED.redisPackage),
  },
  {
    name: "server boundary: lib/server",
    files: ["lib/server/**"],
    rules: restrictImports(RESTRICTED.db, RESTRICTED.redisClient, RESTRICTED.redisPackage),
  },
  {
    // The Redis infrastructure: the client and defineRedisModel().
    name: "server boundary: lib/redis",
    files: ["lib/redis/**"],
    rules: restrictImports(RESTRICTED.db, RESTRICTED.prismaValues),
  },
  {
    // The test Redis helpers talk to the test Redis directly, never through the app's client.
    name: "server boundary: test Redis helpers",
    files: ["test-utils/shared/test-redis.ts", "test-utils/shared/test-redis.vitest.test.ts"],
    rules: restrictImports(RESTRICTED.db, RESTRICTED.prismaValues, RESTRICTED.serverEnv, RESTRICTED.redisClient),
  },
  {
    name: "server boundary: lib/db",
    files: ["lib/db.ts"],
    rules: {
      "@typescript-eslint/no-restricted-imports": "off",
      "no-restricted-syntax": "off",
    },
  },
  {
    // data/ may query through db but never hand it out: db is imported under its own name and used
    // only as `db.<model>` / `db.$...`, so it cannot be re-exported, returned, or passed on.
    // data/ functions only ever export authorized results (DTOs).
    name: "server boundary: data access layer",
    files: ["data/**"],
    rules: {
      ...restrictImports(RESTRICTED.redisPackage),
      "no-restricted-syntax": [
        ...restrictImports(RESTRICTED.redisPackage)["no-restricted-syntax"],
        {
          selector: `:matches(ExportNamedDeclaration, ExportAllDeclaration)[source.value=/${RESTRICTED.db.source}/]`,
          message: RESTRICTED.db.message,
        },
        {
          selector: `ImportDeclaration[source.value=/${RESTRICTED.db.source}/] > :matches(ImportNamespaceSpecifier, ImportSpecifier[local.name!="db"])`,
          message: RESTRICTED.db.message,
        },
        {
          selector: `Identifier[name="db"]:not(.object):not(ImportSpecifier > Identifier)`,
          message: RESTRICTED.db.message,
        },
      ],
    },
  },
  {
    // Route Handlers live only in app/, so the default boundary is the one they extend.
    name: "entry points: route handlers",
    files: ["app/**/route.{ts,tsx,js,jsx,mjs,cjs,mts,cts}"],
    rules: {
      "no-restricted-syntax": [
        ...restrictImports(
          RESTRICTED.db,
          RESTRICTED.prismaValues,
          RESTRICTED.serverEnv,
          RESTRICTED.redisClient,
          RESTRICTED.redisPackage,
        )["no-restricted-syntax"],
        ...ROUTE_EXPORTS,
      ],
    },
  },
  {
    name: "notifications: call sites",
    files: ALL_SOURCES,
    plugins: { notify: { rules: { "call-sites": builtinRules.get("no-restricted-syntax") } } },
    rules: { "notify/call-sites": ["error", ...NOTIFY_OTHER_ACCESS, NOTIFY_OUTSIDE_ACTIONS] },
  },
  {
    // Route Handlers may import { notify }, and nothing else from the module.
    name: "notifications: route handlers",
    files: ["app/**/route.{ts,tsx,js,jsx,mjs,cjs,mts,cts}"],
    rules: { "notify/call-sites": ["error", ...NOTIFY_OTHER_ACCESS] },
  },
  {
    // The module itself and tests (which read the global mock) use it freely.
    name: "notifications: module and tests",
    files: ["lib/notify/**", "test-utils/**", "**/*.vitest.test.*", "**/*.playwright.test.*"],
    rules: { "notify/call-sites": "off" },
  },
]);

export default eslintConfig;
