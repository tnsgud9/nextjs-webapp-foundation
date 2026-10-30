import { environmentManager } from "@tanstack/react-query";
import { HTTPError, type NormalizedOptions } from "ky";
import { afterEach, describe, expect, it } from "vitest";
import { getQueryClient } from "./query-client";

const httpError = (status: number) =>
  new HTTPError(new Response(null, { status }), new Request("http://test/items"), {} as NormalizedOptions);

const retry = () => getQueryClient().getDefaultOptions().queries?.retry as (count: number, error: unknown) => boolean;

afterEach(() => {
  environmentManager.setIsServer(() => typeof window === "undefined");
});

describe("query client", () => {
  it("never retries a 4xx, which answers the same again", () => {
    for (const status of [400, 401, 403, 404, 409, 422, 429]) expect(retry()(0, httpError(status)), String(status)).toBe(false);
  });

  it("retries a 5xx or a network error once", () => {
    for (const error of [httpError(500), httpError(503), new TypeError("Failed to fetch")]) {
      expect(retry()(0, error)).toBe(true);
      expect(retry()(1, error)).toBe(false);
    }
  });

  it("gives each server request its own client and keeps one client in the browser", () => {
    environmentManager.setIsServer(() => true);
    expect(getQueryClient()).not.toBe(getQueryClient());

    environmentManager.setIsServer(() => false);
    expect(getQueryClient()).toBe(getQueryClient());
  });

  it("keeps data fresh for a minute and does not refetch on window focus", () => {
    const queries = getQueryClient().getDefaultOptions().queries;
    expect(queries?.staleTime).toBe(60_000);
    expect(queries?.refetchOnWindowFocus).toBe(false);
  });
});
