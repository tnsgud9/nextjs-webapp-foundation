import * as Sentry from "@sentry/nextjs";
import { describe, expect, it } from "vitest";
import { onRequestError } from "./instrumentation";

describe("instrumentation", () => {
  it("reports the server errors Next.js catches to Sentry through onRequestError", () => {
    expect(onRequestError).toBeTypeOf("function");
    expect(onRequestError).toBe(Sentry.captureRequestError);
  });
});
