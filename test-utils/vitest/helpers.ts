import { vi } from "vitest";

/** Returns what the function throws, and fails the test if it does not throw. */
export function thrown(fn: () => unknown): unknown {
  try {
    fn();
  } catch (error) {
    return error;
  }
  throw new Error("expected the function to throw");
}

/**
 * Imports a module fresh after changing environment variables. Use it to test, from a clean state,
 * modules that read env at load time (`config/env`) or cache per request (`lib/auth`).
 * The changes are undone after the test (unstubEnvs in vitest.config.mts).
 */
export async function importWithEnv<T>(env: Record<string, string>, importer: () => Promise<T>): Promise<T> {
  for (const [key, value] of Object.entries(env)) vi.stubEnv(key, value);
  vi.resetModules();
  return importer();
}
