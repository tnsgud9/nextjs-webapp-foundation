import "server-only";
import { notFound } from "next/navigation";
import type { NextRequest } from "next/server";
import type { z } from "zod";
import { ProblemError } from "@/lib/problem";
import { mapValidationError } from "./error-mapper";

/**
 * External input validation. Values sent by the client are never trusted, whatever their TypeScript
 * types say, so Route Handlers and Server Actions pass input through these functions before using it.
 * A failure throws a 400 validation-failed ProblemError.
 */
export function parseInput<S extends z.ZodType>(schema: S, input: unknown): z.output<S> {
  const result = schema.safeParse(input);
  if (!result.success) throw mapValidationError(result.error);
  return result.data;
}

/** Reads and validates a JSON body. A body that is not JSON is a 400. */
export async function parseJson<S extends z.ZodType>(
  request: Request,
  schema: S,
): Promise<z.output<S>> {
  let body: unknown;
  try {
    body = await request.json();
  } catch (error) {
    throw new ProblemError(400, "The request body is not valid JSON.", { cause: error });
  }
  return parseInput(schema, body);
}

/**
 * Validates the query string. Every value is a string, so read numbers and booleans with `z.coerce`.
 * Repeated keys are collected into arrays.
 */
export function parseSearchParams<S extends z.ZodType>(
  request: NextRequest,
  schema: S,
): z.output<S> {
  return parseInput(schema, entriesToObject(request.nextUrl.searchParams));
}

/**
 * Validates FormData (form input to a Server Action). Repeated keys are collected into arrays.
 * Fields that may be absent, such as checkboxes, are optional or defaulted in the schema.
 */
export function parseFormData<S extends z.ZodType>(formData: FormData, schema: S): z.output<S> {
  return parseInput(schema, entriesToObject(formData));
}

/**
 * Validates a Route Handler's dynamic route params (`context.params`). An invalid param means the path
 * points at nothing, so a failure throws a 404 ProblemError. Pages use `parsePageParams`.
 */
export async function parseParams<S extends z.ZodType>(
  params: Promise<unknown>,
  schema: S,
): Promise<z.output<S>> {
  const result = schema.safeParse(await params);
  if (!result.success) throw new ProblemError(404, undefined, { cause: result.error });
  return result.data;
}

/** Validates a page's dynamic route params. A failure calls `notFound()` to show the 404 page. */
export async function parsePageParams<S extends z.ZodType>(
  params: Promise<unknown>,
  schema: S,
): Promise<z.output<S>> {
  const result = schema.safeParse(await params);
  if (!result.success) notFound();
  return result.data;
}

function entriesToObject(
  source: URLSearchParams | FormData,
): Record<string, FormDataEntryValue | FormDataEntryValue[]> {
  // No prototype, so a `__proto__` key stays an ordinary key that a strict schema rejects.
  const out: Record<string, FormDataEntryValue | FormDataEntryValue[]> = Object.create(null);
  for (const key of new Set(source.keys())) {
    const values = source.getAll(key);
    out[key] = values.length > 1 ? values : values[0];
  }
  return out;
}
