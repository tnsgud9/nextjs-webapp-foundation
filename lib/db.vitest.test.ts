import { describe, expect, it } from "vitest";
import { Prisma } from "@/prisma/client";
import { db, withoutQueryValues } from "./db";

/** Runs in the `db` project, against the test database. */
const SECRET = "secret-value-7f3a";

async function caught(run: () => Promise<unknown>): Promise<Error & { code?: string; meta?: unknown }> {
  try {
    await run();
  } catch (error) {
    return error as Error & { code?: string; meta?: unknown };
  }
  throw new Error("expected the query to fail");
}

function expectNoValue(error: Error & { meta?: unknown }) {
  expect(error.message).not.toContain(SECRET);
  expect(error.stack).not.toContain(SECRET);
  expect(JSON.stringify(error.meta ?? {})).not.toContain(SECRET);
}

describe("Prisma errors carry no query values", () => {
  it("rewrites a database error from a query, keeping its class, code, and the database's error kind", async () => {
    const error = await caught(() => db.$queryRaw`SELECT ${SECRET}::uuid`);
    expect(error).toBeInstanceOf(Prisma.PrismaClientKnownRequestError);
    expect(error.code).toBe("P2010");
    expect(error.message).toBe("prisma.$queryRaw() failed (P2010)");
    expect(error.stack).toMatch(/^PrismaClientKnownRequestError: prisma\.\$queryRaw\(\) failed \(P2010\)\n\s+at /);
    expect(error.meta).toEqual({ driverAdapterError: { cause: { kind: "InvalidInputValue", originalCode: "22P02" } } });
    expectNoValue(error);
  });

  it("covers queries inside an interactive transaction", async () => {
    const error = await caught(() => db.$transaction((tx) => tx.$executeRaw`SELECT ${SECRET}::int`));
    expect(error.message).toBe("prisma.$executeRaw() failed (P2010)");
    expectNoValue(error);
  });

  it("rewrites a validation error, which prints the query's arguments", () => {
    const error = new Prisma.PrismaClientValidationError(`Invalid invocation: { data: { name: "${SECRET}" } }`, {
      clientVersion: "test",
    });
    expect(withoutQueryValues(error, "ExampleItem", "create")).toBe(error);
    expect(error.message).toBe("prisma.exampleItem.create() failed");
    expectNoValue(error);
  });

  it("keeps only names in meta", () => {
    const error = new Prisma.PrismaClientKnownRequestError(`Unique constraint failed: ${SECRET}`, {
      code: "P2002",
      clientVersion: "test",
      meta: {
        modelName: "ExampleItem",
        target: ["name"],
        driverAdapterError: {
          name: "DriverAdapterError",
          cause: { kind: "UniqueConstraintViolation", constraint: { fields: ["name"] }, message: SECRET },
        },
      },
    });
    withoutQueryValues(error, "ExampleItem", "create");
    expect(error.meta).toEqual({
      modelName: "ExampleItem",
      target: ["name"],
      driverAdapterError: { cause: { kind: "UniqueConstraintViolation", constraint: { fields: ["name"] } } },
    });
    expectNoValue(error);
  });

  it("leaves any other error unchanged", () => {
    const error = new Error(SECRET);
    expect(withoutQueryValues(error, undefined, "$queryRaw")).toBe(error);
    expect(error.message).toBe(SECRET);
  });
});
