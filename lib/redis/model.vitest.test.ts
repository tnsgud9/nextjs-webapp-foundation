import { describe, expect, expectTypeOf, it } from "vitest";
import { z } from "zod";
import { importWithEnv } from "@/test-utils/vitest/helpers";

const loadModel = (env: Record<string, string> = {}) =>
  importWithEnv({ SERVICE_NAME: "svc", APP_ENV: "test", ...env }, () => import("./model"));

describe("defineRedisModel", () => {
  it("prefixes keys with the service, environment, and model", async () => {
    const { defineRedisModel } = await loadModel();
    const model = defineRedisModel("import-progress");
    expect(model.key("42")).toBe("svc:test:import-progress:42");
    expect(() => model.key("")).toThrow(/non-empty id/);
  });

  it("sets no TTL by default, and a whole-second TTL when the write asks for one", async () => {
    const { defineRedisModel } = await loadModel();
    const model = defineRedisModel("one-time-code");
    expect(model.writeOptions()).toEqual({});
    expect(model.writeOptions(300)).toEqual({ EX: 300 });
    for (const seconds of [0, 1.5, -1]) expect(() => model.writeOptions(seconds)).toThrow(/whole seconds/);
  });

  it("checks a structured value when writing it and when reading it back", async () => {
    const { defineRedisModel } = await loadModel();
    const model = defineRedisModel("import-progress", { value: z.object({ done: z.number(), total: z.number() }) });
    expectTypeOf(model.parse).returns.toEqualTypeOf<{ done: number; total: number } | undefined>();
    const raw = model.serialize({ done: 1, total: 3 });
    expect(model.parse(raw)).toEqual({ done: 1, total: 3 });
    expect(model.parse('{"done":"one"}')).toBeUndefined();
    expect(model.parse("not json")).toBeUndefined();
    expect(model.parse(null)).toBeUndefined();
    expect(() => model.serialize({ done: "one" } as never)).toThrow();
  });

  it("keeps a value without a schema as a string, and types it as one", async () => {
    const { defineRedisModel } = await loadModel();
    const model = defineRedisModel("counter");
    expectTypeOf(model.parse).returns.toEqualTypeOf<string | undefined>();
    expect(model.parse(model.serialize("7"))).toBe("7");
    expect(model.parse(null)).toBeUndefined();
    // A value type without a schema cannot be declared: nothing would check it.
    // @ts-expect-error -- needs a `value` schema
    defineRedisModel<number>("count");
  });

  it("rejects a name that is not kebab-case", async () => {
    const { defineRedisModel } = await loadModel();
    expect(() => defineRedisModel("ImportProgress")).toThrow(/kebab-case/);
  });
});
