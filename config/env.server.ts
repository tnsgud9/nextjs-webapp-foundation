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
  /**
   * Connections each app instance may open (`lib/db.ts`). Defaults to 3. Every instance has its own
   * pool, so the number of instances times this value must stay within the pooler's client limit.
   */
  DATABASE_POOL_MAX: z.coerce.number().int().min(1).max(100).optional(),
  /** `service.name` in every log line. Defaults to `name` in package.json. */
  SERVICE_NAME: z.string().optional(),
  /** `deployment.environment.name` in every log line. Defaults to `NODE_ENV`. */
  APP_ENV: z.string().optional(),
  /**
   * Incoming webhook of the channel that receives server notifications (`lib/notify`). A secret:
   * anyone holding it can post to the channel. Unset, notifications are skipped.
   */
  NOTIFY_SLACK_WEBHOOK_URL: z.url({ protocol: /^https$/ }).optional(),
});

const parsed = serverEnvSchema.safeParse({
  // Treat an empty string (`FOO=`) as unset.
  DATABASE_URL: process.env.DATABASE_URL || undefined,
  DATABASE_POOL_MAX: process.env.DATABASE_POOL_MAX || undefined,
  SERVICE_NAME: process.env.SERVICE_NAME || undefined,
  APP_ENV: process.env.APP_ENV || undefined,
  NOTIFY_SLACK_WEBHOOK_URL: process.env.NOTIFY_SLACK_WEBHOOK_URL || undefined,
});

if (!parsed.success) {
  throw new Error(
    `Invalid server environment variables:\n${z.prettifyError(parsed.error)}`,
  );
}

export const serverEnv = {
  databaseUrl: parsed.data.DATABASE_URL,
  databasePoolMax: parsed.data.DATABASE_POOL_MAX ?? 3,
  serviceName: parsed.data.SERVICE_NAME ?? packageName,
  environment: parsed.data.APP_ENV ?? process.env.NODE_ENV ?? "development",
  notifySlackWebhookUrl: parsed.data.NOTIFY_SLACK_WEBHOOK_URL,
} as const;
