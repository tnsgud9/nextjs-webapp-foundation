import "server-only";
import type { z } from "zod";
import { serverEnv } from "@/config/env.server";

/**
 * A Redis model is the schema of one kind of Redis key, as a Prisma model is of a table: its name and, for
 * structured values, the zod schema of the value. Define each one in its own file, `redis/models/<name>.ts`,
 * and use it only from `data/`.
 *
 * - Keys are `<service>:<environment>:<model>:<id>` (`SERVICE_NAME`, `APP_ENV`), so services and
 *   environments that share one Redis never read each other's keys.
 * - Redis should run with a memory limit and `maxmemory-policy allkeys-lru` (AGENTS.md, Redis), so any key
 *   can be dropped when memory is full; a `data/` function rebuilds a missing key from its source. Keys do not
 *   expire unless the write sets a TTL (`writeOptions(seconds)`), for data whose expiry means something.
 * - A structured value is checked against its schema when written and when read back, so a value written by
 *   another version of the app is treated as missing rather than trusted. Without a schema the value is a string.
 */
export interface RedisModel<TValue = string> {
  readonly name: string;
  /** The full Redis key for an id within this model. */
  key(id: string): string;
  /** Options for `SET`: a TTL in whole seconds, or none so the key stays until Redis drops it. */
  writeOptions(ttlSeconds?: number): { EX?: number };
  /** Serializes a value for `SET`. */
  serialize(value: TValue): string;
  /** Parses a stored value, or `undefined` when there is none or it does not match the schema. */
  parse(raw: string | null | undefined): TValue | undefined;
}

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/** A model whose values are strings, stored as they are. */
export function defineRedisModel(name: string): RedisModel<string>;
/** A model whose values are checked against `value` and stored as JSON. */
export function defineRedisModel<TValue>(name: string, definition: { value: z.ZodType<TValue> }): RedisModel<TValue>;
export function defineRedisModel(name: string, definition?: { value: z.ZodType<unknown> }): RedisModel<unknown> {
  if (!KEBAB_CASE.test(name)) throw new Error(`Redis model name must be kebab-case: ${name}`);
  const prefix = `${serverEnv.serviceName}:${serverEnv.environment}:${name}:`;
  const schema = definition?.value;
  return {
    name,
    key: (id) => {
      if (id === "") throw new Error(`Redis model ${name} needs a non-empty id`);
      return prefix + id;
    },
    writeOptions: (ttlSeconds) => {
      if (ttlSeconds === undefined) return {};
      if (!Number.isInteger(ttlSeconds) || ttlSeconds < 1) {
        throw new Error(`Redis model ${name} needs a TTL of whole seconds, not ${ttlSeconds}`);
      }
      return { EX: ttlSeconds };
    },
    serialize: (value) => (schema ? JSON.stringify(schema.parse(value)) : String(value)),
    parse: (raw) => {
      if (raw === null || raw === undefined) return undefined;
      if (!schema) return raw;
      try {
        const result = schema.safeParse(JSON.parse(raw));
        return result.success ? result.data : undefined;
      } catch {
        return undefined;
      }
    },
  };
}
