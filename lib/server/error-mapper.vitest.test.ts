import { redirect } from "next/navigation";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { PROBLEM_TYPES, ProblemError } from "@/lib/problem";
import { Prisma } from "@/prisma/client";
import { thrown } from "@/test-utils/vitest/helpers";
import { loggedErrors, SENTRY_EVENT_ID, sentryReports } from "@/test-utils/vitest/setup";
import { mapErrorToProblem, mapValidationError } from "./error-mapper";

const prismaError = (code: string) =>
  new Prisma.PrismaClientKnownRequestError("prisma", { code, clientVersion: "test" });

describe("expected failures", () => {
  it("returns a ProblemError as-is with the request path", () => {
    expect(mapErrorToProblem(new ProblemError(404, "Missing"), "/items/1")).toEqual({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "Missing",
      instance: "/items/1",
    });
  });

  it("maps Prisma unique violations to 409 and missing records to 404", () => {
    expect(mapErrorToProblem(prismaError("P2002")).status).toBe(409);
    expect(mapErrorToProblem(prismaError("P2025")).status).toBe(404);
  });

  it("does not report expected failures", () => {
    mapErrorToProblem(new ProblemError(403));
    mapErrorToProblem(prismaError("P2002"));
    expect(sentryReports()).toEqual([]);
    expect(console.error).not.toHaveBeenCalled();
  });
});

describe("validation failures", () => {
  it("maps zod issues of client input to 400 with JSON Pointers", () => {
    const schema = z
      .object({ name: z.string().min(2), "a/b~c": z.number(), items: z.array(z.object({ qty: z.number().positive() })) })
      .refine((value) => value.name !== "xx", "Whole-object error");
    const error = thrown(() => schema.parse({ name: "a", "a/b~c": "s", items: [{ qty: -1 }] }));

    const problem = mapValidationError(error as z.ZodError).toProblem();
    expect(problem).toMatchObject({ type: PROBLEM_TYPES.validationFailed.type, status: 400 });
    expect(problem.errors?.map((item) => item.pointer)).toEqual(["#/name", "#/a~1b~0c", "#/items/0/qty"]);
  });

  it("points whole-input issues at #", () => {
    const error = thrown(() => z.string().min(2).parse("a"));
    expect(mapValidationError(error as z.ZodError).toProblem().errors?.[0]?.pointer).toBe("#");
  });

  it("treats a raw ZodError as a server bug: 500, reported, with no field details for the client", () => {
    const error = thrown(() => z.object({ count: z.number() }).parse({ count: "stored by an older version" }));
    const problem = mapErrorToProblem(error, "/api/x");
    expect(problem).toMatchObject({ type: "about:blank", status: 500 });
    expect(problem).not.toHaveProperty("errors");
    expect(sentryReports()).toHaveLength(1);
  });
});

describe("unexpected errors", () => {
  it("hides the error, reports it, and returns the event ID as errorId", () => {
    const error = new Error("SECRET internal detail");
    const problem = mapErrorToProblem(error, "/api/x");

    expect(problem).toEqual({
      type: "about:blank",
      title: "Internal Server Error",
      status: 500,
      detail: "We could not process your request. Please try again later.",
      instance: "/api/x",
      errorId: SENTRY_EVENT_ID,
    });
    expect(JSON.stringify(problem)).not.toContain("SECRET");
    expect(sentryReports()).toEqual([{ error, context: { tags: { instance: "/api/x" } } }]);
  });

  it("writes one structured log line tied to the Sentry event and the request", () => {
    const error = new Error("SECRET internal detail");
    mapErrorToProblem(error, "/api/x", { method: "POST", requestId: "req-1" });

    expect(sentryReports()).toEqual([
      { error, context: { tags: { instance: "/api/x", "request.id": "req-1" } } },
    ]);
    expect(loggedErrors()).toEqual([
      expect.objectContaining({
        severity_text: "ERROR",
        body: "Unhandled error in a Route Handler",
        "sentry.event_id": SENTRY_EVENT_ID,
        "request.id": "req-1",
        "http.request.method": "POST",
        "url.path": "/api/x",
        "exception.type": "Error",
        "exception.message": "SECRET internal detail",
      }),
    ]);
  });

  it("treats unknown Prisma error codes and non-Error throws as unexpected", () => {
    expect(mapErrorToProblem(prismaError("P2003")).status).toBe(500);
    expect(mapErrorToProblem("boom").status).toBe(500);
    expect(sentryReports()).toHaveLength(2);
  });
});

describe("Next.js control flow", () => {
  it("rethrows redirect() instead of mapping it", () => {
    const redirectError = thrown(() => redirect("/login"));
    expect(() => mapErrorToProblem(redirectError)).toThrow();
    expect(sentryReports()).toEqual([]);
  });
});
