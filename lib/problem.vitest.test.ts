import { describe, expect, it } from "vitest";
import {
  PROBLEM_TYPE_BASE,
  PROBLEM_TYPES,
  ProblemError,
  defineProblemType,
  httpProblemType,
  isProblem,
} from "./problem";

describe("problem types", () => {
  it("builds a domain type as a relative URI from the shared base", () => {
    const type = defineProblemType("item-locked", "Item Locked", 422);
    expect(type).toEqual({ type: `${PROBLEM_TYPE_BASE}item-locked`, title: "Item Locked", status: 422 });
    expect(type.type).toBe("/problems/item-locked");
  });

  it("rejects a name that is not kebab-case, since a released type can never be renamed", () => {
    for (const name of ["ItemLocked", "item_locked", "item-locked/", ""]) {
      expect(() => defineProblemType(name, "Item Locked", 422)).toThrow(/kebab-case/);
    }
  });

  it("validation failures are 400", () => {
    expect(PROBLEM_TYPES.validationFailed.status).toBe(400);
  });

  it("uses about:blank with the HTTP status phrase for status-only failures", () => {
    expect(httpProblemType(404)).toEqual({ type: "about:blank", title: "Not Found", status: 404 });
    expect(httpProblemType(418).title).toBe("HTTP 418");
  });
});

describe("ProblemError", () => {
  it("serializes a status-only failure", () => {
    expect(new ProblemError(404, "Missing").toProblem("/items/1")).toEqual({
      type: "about:blank",
      title: "Not Found",
      status: 404,
      detail: "Missing",
      instance: "/items/1",
    });
  });

  it("omits detail and instance when not given", () => {
    expect(new ProblemError(403).toProblem()).toEqual({ type: "about:blank", title: "Forbidden", status: 403 });
  });

  it("keeps extensions but never lets them override standard members", () => {
    const type = defineProblemType("closed", "Closed", 422);
    const problem = new ProblemError(type, "Already closed", {
      extensions: { itemId: "item-1", status: 200, type: "hijack", title: "x" },
    }).toProblem();
    expect(problem).toMatchObject({ itemId: "item-1", status: 422, type: type.type, title: "Closed" });
  });

  it("carries field errors as the errors member", () => {
    const errors = [{ pointer: "#/name", detail: "Required" }];
    expect(new ProblemError(PROBLEM_TYPES.validationFailed, "Check", { errors }).toProblem().errors).toEqual(errors);
  });
});

describe("isProblem", () => {
  it("accepts a Problem shape and rejects anything else", () => {
    expect(isProblem({ type: "about:blank", title: "Not Found", status: 404 })).toBe(true);
    expect(isProblem({ message: "x" })).toBe(false);
    expect(isProblem({ type: "about:blank", title: "x", status: "404" })).toBe(false);
    expect(isProblem(null)).toBe(false);
    expect(isProblem("text")).toBe(false);
  });
});
