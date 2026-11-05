import "server-only";
import type { NextRequest } from "next/server";
import type { ActionResult } from "@/lib/problem";
import { mapErrorToProblem, mapExpectedError } from "./error-mapper";
import { REQUEST_ID_HEADER } from "./logger";

/**
 * Error handlers per server entry point. They only turn errors into Problems through `error-mapper`
 * and send them out in the shape each entry point needs. The success path is untouched.
 *
 * They do no authentication, authorization, or input validation; each handler and action checks those
 * itself (a Server Action is a public endpoint anyone can call).
 */

/**
 * Wraps a Route Handler. On success the handler returns its own `Response`; on failure it throws
 * a `ProblemError` or another error, which is answered with the Problem's status code and an
 * `application/problem+json` body. Pass Next's global `RouteContext<"/path">` as the generic
 * `context` type.
 */
export function withRouteErrorHandler<Context = unknown>(
  handler: (request: NextRequest, context: Context) => Promise<Response>,
): (request: NextRequest, context: Context) => Promise<Response> {
  return async (request, context) => {
    try {
      return await handler(request, context);
    } catch (error) {
      const problem = mapErrorToProblem(error, request.nextUrl.pathname, {
        method: request.method,
        requestId: request.headers.get(REQUEST_ID_HEADER) ?? undefined,
      });
      return new Response(JSON.stringify(problem), {
        status: problem.status,
        headers: { "Content-Type": "application/problem+json" },
      });
    }
  };
}

/**
 * Wraps a Server Action and returns its result as `ActionResult`. Export the wrapped function as-is
 * from the `"use server"` file. It takes the same arguments, so it also works with `useActionState`.
 *
 * Expected failures become a return value carrying the Problem (`{ ok: false, problem }`) for the form
 * to handle. Unexpected errors are rethrown: Next reports them through `onRequestError`, and the nearest
 * `error.tsx` shows only the digest (the approach Next recommends).
 */
export function withActionErrorHandler<Args extends unknown[], T>(
  action: (...args: Args) => Promise<T>,
): (...args: Args) => Promise<ActionResult<T>> {
  return async (...args) => {
    try {
      return { ok: true, data: await action(...args) };
    } catch (error) {
      const problem = mapExpectedError(error);
      if (!problem) throw error;
      return { ok: false, problem };
    }
  };
}
