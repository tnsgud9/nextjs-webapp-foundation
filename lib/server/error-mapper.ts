import "server-only";
import { unstable_rethrow } from "next/navigation";
import type { z } from "zod";
import {
  PROBLEM_TYPES,
  ProblemError,
  type Problem,
  type ProblemFieldError,
} from "@/lib/problem";
import { Prisma } from "@/prisma/client";

/**
 * Rules for turning errors caught on the server into Problems. Only this file decides which Problem
 * an error becomes; `error-handlers.ts` sends it out in the shape each entry point needs.
 *
 * - Errors Next.js uses for control flow, such as `redirect()` and `notFound()`, are rethrown.
 * - A raw ZodError is not an expected failure: client input is validated through `./validation`, so a ZodError
 *   that gets here comes from the server's own data (a stored value, an outside response) and is a bug, handled
 *   like any unknown error rather than blamed on the client as a 400.
 * - Unknown errors go only to the server log; the client gets only a generic message.
 */
export function mapErrorToProblem(error: unknown, instance?: string): Problem {
  unstable_rethrow(error);

  const problemError = mapToProblemError(error);
  if (problemError) return problemError.toProblem(instance);

  console.error(error);
  return new ProblemError(500, "We could not process your request. Please try again later.").toProblem(
    instance,
  );
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
