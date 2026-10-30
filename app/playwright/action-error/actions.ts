"use server";
import { withActionErrorHandler } from "@/lib/server/error-handlers";

// Playwright only. An unexpected error inside a Server Action.
export const failAction = withActionErrorHandler(async (): Promise<never> => {
  throw new Error("PLAYWRIGHT-SECRET-ACTION-ERROR");
});
