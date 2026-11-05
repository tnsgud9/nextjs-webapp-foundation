import "server-only";
import { z } from "zod";
import { name as packageName } from "@/package.json";

/**
 * Server-only environment variables. They must never reach the client bundle,
 * so only server code (Route Handlers, Server Actions, RSC) imports this module.
 *
 * Public variables (`NEXT_PUBLIC_*`) belong in `config/env.ts`. A server secret placed
 * there would leak into the client bundle, so always add secrets here.
 * Add each variable a feature needs to the schema and expose it through `serverEnv`.
 */
const serverEnvSchema = z.object({
  /**
   * PostgreSQL connection string for the app runtime (Prisma Client).
   * On Supabase, use the Supavisor transaction pooler (6543).
   * `DIRECT_URL` for migrations is read only by the Prisma CLI, so it is not here.
   */
  DATABASE_URL: z.url().optional(),
  /** `service.name` in every log line. Defaults to `name` in package.json. */
  SERVICE_NAME: z.string().optional(),
  /** `deployment.environment.name` in every log line. Defaults to `NODE_ENV`. */
  APP_ENV: z.string().optional(),
});

const parsed = serverEnvSchema.safeParse({
  // Treat an empty string (`FOO=`) as unset.
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  SERVICE_NAME: process.env.SERVICE_NAME || undefined,
  APP_ENV: process.env.APP_ENV || undefined,
});

if (!parsed.success) {
  throw new Error(
    `Invalid server environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const serverEnv = {
  databaseUrl: parsed.data.DATABASE_URL,
  serviceName: parsed.data.SERVICE_NAME ?? packageName,
  environment: parsed.data.APP_ENV ?? process.env.NODE_ENV ?? "development",
} as const;
