import { HTTPError } from "ky";
import { describe, expect, it, vi } from "vitest";
import { apiGet, getProblem } from "./ky";

function respondWith(body: string, status: number, contentType: string) {
  vi.stubGlobal("fetch", vi.fn(async () => new Response(body, { status, headers: { "content-type": contentType } })));
}

async function failure(): Promise<Error> {
  try {
    await apiGet("http://test/x");
  } catch (error) {
    return error as Error;
  }
  throw new Error("expected the request to fail");
}

describe("Problem responses", () => {
  const problem = {
    type: "/problems/closed",
    title: "Closed",
    status: 422,
    detail: "The item is already locked.",
    itemId: "item-1",
  };

  it("uses detail as the error message and exposes the Problem", async () => {
    respondWith(JSON.stringify(problem), 422, "application/problem+json");
    const error = await failure();
    expect(error).toBeInstanceOf(HTTPError);
    expect(error.message).toBe("The item is already locked.");
    expect(getProblem(error)).toEqual(problem);
  });

  it("falls back to title when there is no detail", async () => {
    respondWith(JSON.stringify({ ...problem, detail: undefined }), 422, "application/problem+json");
    expect((await failure()).message).toBe("Closed");
  });
});

describe("other error bodies", () => {
  it("uses a message field from non-Problem JSON (external APIs)", async () => {
    respondWith(JSON.stringify({ message: "rate limited" }), 429, "application/json");
    const error = await failure();
    expect(error.message).toBe("rate limited");
    expect(getProblem(error)).toBeUndefined();
  });

  it("uses a plain text body", async () => {
    respondWith("Bad Gateway", 502, "text/plain");
    expect((await failure()).message).toBe("Bad Gateway");
  });
});
