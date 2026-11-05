import * as Sentry from "@sentry/nextjs";
import { beforeEach, vi } from "vitest";

/**
 * Runs before every Vitest test file (setupFiles in vitest.config.mts).
 *
 * - Sentry never sends anything. `captureException` returns a fixed event ID; read the reports with `sentryReports()`.
 * - `cookies()` from `next/headers` returns the cookies set with `setRequestCookies()`.
 * - Server error logs (`console.error`) are silenced; read the structured ones with `loggedErrors()`.
 */
// vi.mock is hoisted to the top of the file, so values its factory uses are hoisted with vi.hoisted.
const sentry = vi.hoisted(() => ({ eventId: "test-event-id" }));
export const SENTRY_EVENT_ID = sentry.eventId;

let requestCookies: { name: string; value: string }[] = [];

/** Cookies sent with the request in the current test. Cleared before each test. */
export function setRequestCookies(cookies: { name: string; value: string }[]): void {
  requestCookies = cookies;
}

vi.mock("@sentry/nextjs", () => ({ captureException: vi.fn(() => sentry.eventId), captureRequestError: vi.fn() }));

/** Errors reported to Sentry in the current test, with their context. Expected failures leave this empty. */
export function sentryReports(): { error: unknown; context: unknown }[] {
  return vi.mocked(Sentry.captureException).mock.calls.map(([error, context]) => ({ error, context }));
}

/** Error log records (`lib/server/logger.ts`) written in the current test, parsed from their JSON lines. */
export function loggedErrors(): Record<string, unknown>[] {
  return vi.mocked(console.error).mock.calls.map(([line]) => JSON.parse(String(line)) as Record<string, unknown>);
}

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => requestCookies, set: () => {} }),
}));

beforeEach(() => {
  requestCookies = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
});
