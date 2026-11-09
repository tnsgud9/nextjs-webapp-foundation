import { redirect } from "next/navigation";
import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { ProblemError } from "@/lib/problem";
import { loggedErrors, SENTRY_EVENT_ID, sentryReports } from "@/test-utils/vitest/setup";
import { loadForPage, withActionErrorHandler, withRouteErrorHandler } from "./error-handlers";

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

  it("logs the method, the path without the query, and the proxy's request ID", async () => {
    const withId = new NextRequest("http://test/api/items/1?secret=q", { headers: { "x-request-id": "req-1" } });
    await withRouteErrorHandler(failWith(new Error("boom")))(withId, undefined);
    expect(loggedErrors()).toEqual([
      expect.objectContaining({ "request.id": "req-1", "http.request.method": "GET", "url.path": "/api/items/1" }),
    ]);
    expect(JSON.stringify(loggedErrors())).not.toContain("secret=q");
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

describe("loadForPage", () => {
  const digestOf = (error: unknown) => (error as { digest?: string }).digest ?? "";

  it("returns what the data/ call returns", async () => {
    await expect(loadForPage(async () => ({ id: "1" }))).resolves.toEqual({ id: "1" });
  });

  it.each([404, 403])("shows the not-found page for a %i, so a forbidden resource looks missing", async (status) => {
    const error = await loadForPage(failWith(new ProblemError(status))).catch((caught: unknown) => caught);
    expect(digestOf(error)).toMatch(/^NEXT_HTTP_ERROR_FALLBACK;404/);
  });

  it("redirects a 401 to sign-in", async () => {
    const error = await loadForPage(failWith(new ProblemError(401))).catch((caught: unknown) => caught);
    expect(digestOf(error)).toContain(";/login;");
  });

  it.each([
    ["another expected failure", new ProblemError(409)],
    ["an unexpected error", new Error("boom")],
  ])("rethrows %s for error.tsx", async (_name, original) => {
    await expect(loadForPage(failWith(original))).rejects.toBe(original);
  });
});
