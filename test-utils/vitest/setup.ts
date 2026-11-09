import * as Sentry from "@sentry/nextjs";
import { beforeEach, vi } from "vitest";
import { notify } from "@/lib/notify";

/**
 * Runs before every Vitest test file (setupFiles in vitest.config.mts).
 *
 * - Sentry never sends anything. `captureException` returns a fixed event ID; read the reports with `sentryReports()`.
 * - Notifications (`@/lib/notify`) are never sent; read what code asked to send with `sentNotifications()`.
 *   The tests of `lib/notify` itself test its modules directly.
 * - `cookies()` from `next/headers` returns the cookies set with `setRequestCookies()`; `headers()` is empty.
 * - Server error and warning logs are silenced; read them with `loggedErrors()` and `loggedWarnings()`.
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

// Kinds are still defined for real, so code that defines one loads as in production.
vi.mock("@/lib/notify", async () => ({
  defineNotification: (await vi.importActual<typeof import("@/lib/notify/kind")>("@/lib/notify/kind")).defineNotification,
  notify: vi.fn(),
  sendNotification: vi.fn(async () => true),
}));

/** Notifications passed to `notify()` in the current test, in order, by kind name and data. */
export function sentNotifications(): { kind: string; data: unknown }[] {
  return vi.mocked(notify).mock.calls.map(([kind, data]) => ({ kind: kind.name, data }));
}

/** Error log records (`lib/server/logger.ts`) written in the current test, parsed from their JSON lines. */
export function loggedErrors(): Record<string, unknown>[] {
  return vi.mocked(console.error).mock.calls.map(([line]) => JSON.parse(String(line)) as Record<string, unknown>);
}

/** Warning log records written in the current test, like `loggedErrors()`. */
export function loggedWarnings(): Record<string, unknown>[] {
  return vi.mocked(console.warn).mock.calls.map(([line]) => JSON.parse(String(line)) as Record<string, unknown>);
}

vi.mock("next/headers", () => ({
  cookies: async () => ({ getAll: () => requestCookies, set: () => {} }),
  headers: async () => new Headers(),
}));

beforeEach(() => {
  requestCookies = [];
  vi.spyOn(console, "error").mockImplementation(() => {});
  vi.spyOn(console, "warn").mockImplementation(() => {});
});
