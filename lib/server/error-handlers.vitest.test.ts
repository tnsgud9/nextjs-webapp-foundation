import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/problem";
import { SENTRY_EVENT_ID, sentryReports } from "@/test-utils/vitest/setup";
import { withActionErrorHandler, withRouteErrorHandler } from "./error-handlers";

const request = () => new NextRequest("http://test/api/items/1?secret=q");
const failWith = (error: unknown) => async (): Promise<never> => {
  throw error;
};

describe("withRouteErrorHandler", () => {
  it("passes a successful Response through untouched", async () => {
    const response = await withRouteErrorHandler(async () => Response.json({ ok: true }, { status: 201 }))(
      request(),
      undefined,
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toEqual({ ok: true });
  });

  it("answers a thrown ProblemError as application/problem+json with the request path", async () => {
    const response = await withRouteErrorHandler(failWith(new ProblemError(404, "Missing")))(request(), undefined);
    expect(response.status).toBe(404);
    expect(response.headers.get("content-type")).toBe("application/problem+json");
    await expect(response.json()).resolves.toEqual({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "Missing",
      instance: "/api/items/1",
    });
  });

  it("hides unexpected errors behind a 500 Problem with an errorId", async () => {
    const body = await (await withRouteErrorHandler(failWith(new Error("SECRET")))(request(), undefined)).text();
    expect(body).not.toContain("SECRET");
    expect(JSON.parse(body)).toMatchObject({ status: 500, errorId: SENTRY_EVENT_ID });
  });

  it("lets redirect() propagate to Next.js", async () => {
    await expect(withRouteErrorHandler(async () => redirect("/login"))(request(), undefined)).rejects.toThrow();
  });
});

describe("withActionErrorHandler", () => {
  it("wraps a successful result and keeps the action arguments", async () => {
    await expect(withActionErrorHandler(async (a: number, b: number) => a + b)(1, 2)).resolves.toEqual({
      ok: true,
      data: 3,
    });
  });

  it("returns a thrown ProblemError as { ok: false, problem } without instance", async () => {
    await expect(withActionErrorHandler(failWith(new ProblemError(403, "No access")))()).resolves.toEqual({
      ok: false,
      problem: { type: "about:blank", title: "Forbidden", status: 403, detail: "No access" },
    });
  });

  it("rethrows unexpected errors for error.tsx without reporting them itself", async () => {
    const error = new Error("SECRET");
    await expect(withActionErrorHandler(failWith(error))()).rejects.toBe(error);
    expect(sentryReports()).toEqual([]);
  });

  it("lets redirect() propagate to Next.js", async () => {
    await expect(withActionErrorHandler(async () => redirect("/login"))()).rejects.toThrow();
  });
});
