/**
 * The error contract shared by server and client: RFC 9457 Problem Details (`application/problem+json`).
 *
 * - Clients branch on `type` only. `title` and `detail` are human-readable text.
 * - Failures fully described by the status code use `type: "about:blank"` with the HTTP status phrase as `title`.
 * - Domain-specific failures are defined with `defineProblemType()` in each domain module. This file
 *   holds only the app-wide types.
 * - Route Handlers return the Problem as the response body; Server Actions return it in `ActionResult`
 *   (in production, the message of an error a Server Action throws never reaches the client).
 */

/**
 * Prefix of problem type URIs. A type is an identifier, so it is a relative URI reference (RFC 9457
 * allows one) with no scheme or host: the same in every environment, and set by no deployment.
 */
export const PROBLEM_TYPE_BASE = "/problems/";

export interface ProblemFieldError {
  /** JSON Pointer into the request body (RFC 6901 fragment), such as `#/items/0/qty`; `#` is the whole body. */
  pointer: string;
  detail: string;
}

export interface Problem {
  type: string;
  title: string;
  status: number;
  /** Explanation of this occurrence. Only text that is safe to show to the user. */
  detail?: string;
  /** Path of the request that failed. */
  instance?: string;
  /** Per-field errors when input validation fails. */
  errors?: ProblemFieldError[];
  /** Extension members. They reach the client, so include only values the domain explicitly chose. */
  [extension: string]: unknown;
}

export interface ProblemType {
  type: string;
  title: string;
  status: number;
}

const KEBAB_CASE = /^[a-z0-9]+(-[a-z0-9]+)*$/;

/**
 * Defines a domain problem type. Write `name` in kebab-case and never change it once released: clients
 * branch on the type it makes.
 */
export function defineProblemType(name: string, title: string, status: number): ProblemType {
  if (!KEBAB_CASE.test(name)) throw new Error(`Problem type names must be kebab-case: ${name}`);
  return { type: `${PROBLEM_TYPE_BASE}${name}`, title, status };
}

/** App-wide problem types. */
export const PROBLEM_TYPES = {
  validationFailed: defineProblemType("validation-failed", "Validation Failed", 400),
} as const;

const HTTP_STATUS_TITLES: Record<number, string> = {
  400: "Bad Request",
  401: "Unauthorized",
  403: "Forbidden",
  404: "Not Found",
  409: "Conflict",
  422: "Unprocessable Content",
  429: "Too Many Requests",
  500: "Internal Server Error",
};

/** Problem type with no meaning beyond the status code (`about:blank`). */
export function httpProblemType(status: number): ProblemType {
  return { type: "about:blank", title: HTTP_STATUS_TITLES[status] ?? `HTTP ${status}`, status };
}

/**
 * Signals an expected failure. Server code throws it, and the wrappers in `lib/server/` turn it
 * into a Problem response. `detail` and `extensions` reach the client.
 */
export class ProblemError extends Error {
  readonly problemType: ProblemType;
  readonly detail?: string;
  readonly extensions?: Record<string, unknown>;

  constructor(
    problemType: ProblemType | number,
    detail?: string,
    options?: { extensions?: Record<string, unknown>; errors?: ProblemFieldError[]; cause?: unknown },
  ) {
    const resolved = typeof problemType === "number" ? httpProblemType(problemType) : problemType;
    super(detail ?? resolved.title, { cause: options?.cause });
    this.name = "ProblemError";
    this.problemType = resolved;
    this.detail = detail;
    this.extensions = options?.errors
      ? { ...options.extensions, errors: options.errors }
      : options?.extensions;
  }

  get status(): number {
    return this.problemType.status;
  }

  toProblem(instance?: string): Problem {
    // Spread extensions first so they cannot override the standard members.
    return {
      ...this.extensions,
      ...this.problemType,
      ...(this.detail !== undefined && { detail: this.detail }),
      ...(instance !== undefined && { instance }),
    };
  }
}

/** Return type of Server Actions. Usable as-is as `useActionState` state. */
export type ActionResult<T = void> =
  | { ok: true; data: T }
  | { ok: false; problem: Problem };

export function isProblem(value: unknown): value is Problem {
  if (!value || typeof value !== "object") return false;
  const { type, title, status } = value as Record<string, unknown>;
  return typeof type === "string" && typeof title === "string" && typeof status === "number";
}
