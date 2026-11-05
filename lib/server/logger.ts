import "server-only";
import { serverEnv } from "@/config/env.server";

/**
 * Structured server log: one JSON object per line on stdout / stderr, for whatever collector the deployment uses.
 * Field names follow the OpenTelemetry log data model and semantic conventions,
 * so collectors need no per-field mapping. No dependencies, so it also runs in the Edge runtime.
 *
 * - `exception` takes the caught value and becomes `exception.type` / `.message` / `.stacktrace`.
 * - Attributes whose key looks secret or personal (token, cookie, password, email, …) are replaced
 *   with `[REDACTED]`. Still never pass request bodies, headers, or query strings.
 * - Logging never throws.
 */
export type LogAttributes = Record<string, unknown> & { exception?: unknown };

type Level = "info" | "warn" | "error";

/** Request header carrying the request ID the proxy sets. */
export const REQUEST_ID_HEADER = "x-request-id";

const REDACTED_KEY = /password|passwd|secret|token|authorization|cookie|session|api[-_.]?key|e-?mail/i;
const MAX_STACKTRACE = 16_000;
const MAX_CAUSES = 3;

function redact(value: unknown, seen: WeakSet<object>, depth = 0): unknown {
  if (typeof value === "bigint") return value.toString();
  if (value === null || typeof value !== "object") return value;
  if (seen.has(value)) return "[Circular]";
  if (depth >= 5) return "[Truncated]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => redact(item, seen, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [
      key,
      REDACTED_KEY.test(key) ? "[REDACTED]" : redact(item, seen, depth + 1),
    ]),
  );
}

function exceptionAttributes(error: unknown): Record<string, string> {
  if (!(error instanceof Error)) return { "exception.type": typeof error, "exception.message": String(error) };

  let stacktrace = error.stack ?? `${error.name}: ${error.message}`;
  let cause = error.cause;
  for (let i = 0; i < MAX_CAUSES && cause !== undefined; i++) {
    stacktrace += `\nCaused by: ${cause instanceof Error ? (cause.stack ?? cause.message) : String(cause)}`;
    cause = cause instanceof Error ? cause.cause : undefined;
  }
  const attributes: Record<string, string> = {
    "exception.type": error.name,
    "exception.message": error.message,
    "exception.stacktrace": stacktrace.slice(0, MAX_STACKTRACE),
  };
  if ("digest" in error && typeof error.digest === "string") attributes["next.digest"] = error.digest;
  return attributes;
}

function write(level: Level, body: string, attributes: LogAttributes = {}): void {
  try {
    const { exception, ...rest } = attributes;
    const record: Record<string, unknown> = {
      timestamp: new Date().toISOString(),
      severity_text: level.toUpperCase(),
      body,
      "service.name": serverEnv.serviceName,
      "deployment.environment.name": serverEnv.environment,
    };
    const extra = {
      ...(redact(rest, new WeakSet()) as Record<string, unknown>),
      ...("exception" in attributes ? exceptionAttributes(exception) : {}),
    };
    // The fixed fields above cannot be overwritten.
    for (const [key, value] of Object.entries(extra)) if (!(key in record)) record[key] = value;
    console[level](JSON.stringify(record));
  } catch {
    console[level](body);
  }
}

export const logger = {
  info: (body: string, attributes?: LogAttributes) => write("info", body, attributes),
  warn: (body: string, attributes?: LogAttributes) => write("warn", body, attributes),
  error: (body: string, attributes?: LogAttributes) => write("error", body, attributes),
};
