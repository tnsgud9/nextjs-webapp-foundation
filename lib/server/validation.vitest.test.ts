import { NextRequest } from "next/server";
import { describe, expect, it } from "vitest";
import { z } from "zod";
import { PROBLEM_TYPES, type ProblemError } from "@/lib/problem";
import { thrown } from "@/test-utils/vitest/helpers";
import { parseFormData, parseInput, parseJson, parsePageParams, parseParams, parseSearchParams } from "./validation";

describe("parseInput", () => {
  it("returns the parsed output", () => {
    expect(parseInput(z.object({ n: z.coerce.number() }), { n: "3" })).toEqual({ n: 3 });
  });

  it("throws a 400 validation ProblemError with field pointers", () => {
    const error = thrown(() => parseInput(z.object({ n: z.number() }), { n: "x" })) as ProblemError;
    const problem = error.toProblem();
    expect(problem).toMatchObject({ type: PROBLEM_TYPES.validationFailed.type, status: 400 });
    expect(problem.errors?.[0]?.pointer).toBe("#/n");
  });

  it("rejects unknown keys with a strict schema (mass assignment)", () => {
    const error = thrown(() => parseInput(z.object({ name: z.string() }).strict(), { name: "a", role: "admin" }));
    expect(error).toMatchObject({ status: 400 });
  });
});

describe("parseJson", () => {
  const schema = z.object({ name: z.string().min(2) });
  const post = (body: string) => new Request("http://test/x", { method: "POST", body });

  it("parses and validates a JSON body", async () => {
    await expect(parseJson(post(JSON.stringify({ name: "ab" })), schema)).resolves.toEqual({ name: "ab" });
  });

  it("answers 400 about:blank for a body that is not JSON", async () => {
    await expect(parseJson(post("{oops"), schema)).rejects.toMatchObject({
      status: 400,
      problemType: { type: "about:blank" },
    });
  });

  it("answers 400 validation-failed for an invalid body", async () => {
    await expect(parseJson(post(JSON.stringify({ name: "a" })), schema)).rejects.toMatchObject({
      problemType: PROBLEM_TYPES.validationFailed,
    });
  });
});

describe("parseSearchParams and parseFormData", () => {
  it("reject a __proto__ key as an unknown key", () => {
    const request = new NextRequest("http://test/x?n=1&__proto__=a");
    const error = thrown(() => parseSearchParams(request, z.object({ n: z.coerce.number() }).strict())) as ProblemError;
    expect(error.status).toBe(400);
  });

  it("coerce values and collect repeated keys into arrays", () => {
    const request = new NextRequest("http://test/x?n=3&tag=a&tag=b");
    expect(parseSearchParams(request, z.object({ n: z.coerce.number(), tag: z.array(z.string()) }))).toEqual({
      n: 3,
      tag: ["a", "b"],
    });

    const formData = new FormData();
    formData.append("name", "ok");
    formData.append("tags", "a");
    formData.append("tags", "b");
    expect(parseFormData(formData, z.object({ name: z.string(), tags: z.array(z.string()) }))).toEqual({
      name: "ok",
      tags: ["a", "b"],
    });
  });
});

describe("parseParams and parsePageParams", () => {
  const schema = z.object({ id: z.uuid() }).strict();
  const id = "0190a6b2-7c1e-7d3a-9f00-000000000001";

  it("return the parsed route params", async () => {
    await expect(parseParams(Promise.resolve({ id }), schema)).resolves.toEqual({ id });
    await expect(parsePageParams(Promise.resolve({ id }), schema)).resolves.toEqual({ id });
  });

  it("answer an invalid param as not found: a 404 Problem, or notFound() in pages", async () => {
    const error = await parseParams(Promise.resolve({ id: "1" }), schema).catch((e: unknown) => e);
    expect((error as ProblemError).status).toBe(404);
    await expect(parsePageParams(Promise.resolve({ id: "1" }), schema)).rejects.toThrow("NEXT_HTTP_ERROR_FALLBACK;404");
  });
});
