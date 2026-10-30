import ky, { HTTPError } from "ky";
import { isProblem, type Problem } from "@/lib/problem";

/**
 * The project's single HTTP client: a general-purpose requester not tied to any API server.
 *
 * - No `baseUrl`: callers pass an absolute URL or a same-origin path.
 * - No `credentials` (default `same-origin`): cookies are not sent cross-origin.
 *   Turn them on only at the call sites that need credentials.
 * - `retry: 0`: refetch and retry policy belongs to the caller (or the query layer).
 */
export const api = ky.create({
  retry: 0,
  hooks: {
    beforeError: [
      ({ error }) => {
        if (!(error instanceof HTTPError)) return error;
        // ky v2 parses the body into `error.data` when it creates the HTTPError.
        // `error.response` has already been consumed here, so read `error.data`.
        const message = extractMessage(error.data);
        if (message) error.message = message;
        return error;
      },
    ],
  },
});

function extractMessage(data: unknown): string | undefined {
  // This project's server answers with RFC 9457 Problems (`lib/problem.ts`).
  if (isProblem(data)) return data.detail ?? data.title;
  if (typeof data === "string") return data || undefined;
  if (data && typeof data === "object" && "message" in data) {
    const { message } = data as { message?: unknown };
    if (typeof message === "string") return message;
  }
  return undefined;
}

/**
 * Returns the body of a failed response when it is a Problem (`application/problem+json`).
 * Use it to branch on `type` or to show `errors` on form fields.
 */
export function getProblem(error: unknown): Problem | undefined {
  if (error instanceof HTTPError && isProblem(error.data)) return error.data;
  return undefined;
}

export type QueryParams = Record<string, string | number | boolean | undefined>;

/** Drops undefined and empty-string values so no empty query parameters are sent. */
function cleanParams(params?: QueryParams): Record<string, string | number | boolean> | undefined {
  if (!params) return undefined;
  const out: Record<string, string | number | boolean> = {};
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") out[key] = value;
  }
  return out;
}

export function apiGet<T>(url: string, searchParams?: QueryParams): Promise<T> {
  return api.get(url, { searchParams: cleanParams(searchParams) }).json<T>();
}

export function apiPost<T>(url: string, json?: unknown): Promise<T> {
  return api.post(url, json === undefined ? undefined : { json }).json<T>();
}

export function apiPut<T>(url: string, json?: unknown): Promise<T> {
  return api.put(url, json === undefined ? undefined : { json }).json<T>();
}

export function apiPatch<T>(url: string, json?: unknown): Promise<T> {
  return api.patch(url, json === undefined ? undefined : { json }).json<T>();
}

/** 204 No Content response: the body is not parsed. */
export async function apiDelete(url: string): Promise<void> {
  await api.delete(url);
}
