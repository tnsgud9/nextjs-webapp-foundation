import "server-only";
import * as Sentry from "@sentry/nextjs";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import {
  PROBLEM_TYPES,
  ProblemError,
  type Problem,
  type ProblemFieldError,
} from "@/lib/problem";
import { Prisma } from "@/prisma/client";
import { logger } from "./logger";

/**
 * Rules for turning errors caught on the server into Problems. Only this file decides which Problem
 * an error becomes; `error-handlers.ts` sends it out in the shape each entry point needs.
 *
 * - Errors Next.js uses for control flow, such as `redirect()` and `notFound()`, are rethrown.
 * - Expected failures (ProblemError, including the validation failures `./validation` throws, and known Prisma
 *   errors) are not reported. A raw ZodError is not one of them: client input is validated through
 *   `./validation`, so a ZodError that gets here comes from the server's own data (a stored value, an outside
 *   response) and is a bug, reported like any unexpected error rather than blamed on the client as a 400.
 * - Unknown errors (`mapErrorToProblem`, for Route Handlers) go to the server log and Sentry; the client
 *   gets only a generic message and an `errorId` that ties the two together. Route Handler errors never
 *   reach Next's `onRequestError`, so they are reported here. Server Actions use only
 *   `mapExpectedError` and rethrow unknown errors for `onRequestError`.
 * - `request` adds the method and the proxy's request ID to the log line and the Sentry tags.
 */
export function mapErrorToProblem(
  error: unknown,
  instance?: string,
  request?: { method: string; requestId?: string },
): Problem {
  const expected = mapExpectedError(error, instance);
  if (expected) return expected;

  const tags = {
    ...(instance && { instance }),
    ...(request?.requestId && { "request.id": request.requestId }),
  };
  const errorId = Sentry.captureException(error, Object.keys(tags).length > 0 ? { tags } : undefined);
  logger.error("Unhandled error in a Route Handler", {
    exception: error,
    "sentry.event_id": errorId,
    "request.id": request?.requestId,
    "http.request.method": request?.method,
    "url.path": instance,
  });
  return new ProblemError(500, "We could not process your request. Please try again later.", {
    extensions: { errorId },
  }).toProblem(instance);
}

/** Turns only expected failures into Problems and returns `undefined` for anything else. Reports nothing. */
export function mapExpectedError(error: unknown, instance?: string): Problem | undefined {
  unstable_rethrow(error);
  return mapToProblemError(error)?.toProblem(instance);
}

function mapToProblemError(error: unknown): ProblemError | undefined {
  if (error instanceof ProblemError) return error;
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    // https://www.prisma.io/docs/orm/reference/error-reference
    switch (error.code) {
      case "P2002": // unique constraint
        return new ProblemError(409, "The data already exists.", { cause: error });
      case "P2025": // target record not found (update, delete, and so on)
        return new ProblemError(404, "The requested item was not found.", { cause: error });
    }
  }
  return undefined;
}

/** Turns a zod validation failure into a list of per-field JSON Pointer errors. */
export function mapValidationError(error: z.ZodError): ProblemError {
  const errors: ProblemFieldError[] = error.issues.map((issue) => ({
    pointer: toJsonPointer(issue.path),
    detail: issue.message,
  }));
  return new ProblemError(PROBLEM_TYPES.validationFailed, "Please check your input.", {
    errors,
    cause: error,
  });
}

/** RFC 6901: `~` → `~0`, `/` → `~1`. An empty path is the whole document (`#`). */
function toJsonPointer(path: readonly PropertyKey[]): string {
  return `#${path.map((key) => `/${String(key).replaceAll("~", "~0").replaceAll("/", "~1")}`).join("")}`;
}
