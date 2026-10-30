import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import GlobalError from "./global-error";

/**
 * The screen shown when the root layout fails. Playwright test pages cannot reproduce a root-layout
 * failure, so only the rendering is checked; Next handles routing to this screen.
 */
const render = (error: unknown) => renderToStaticMarkup(createElement(GlobalError, { error, retry: () => {} }));

describe("global error page", () => {
  it("renders its own document with a retry button", () => {
    const html = render(new Error("x"));
    expect(html).toMatch(/^<html lang="en">/);
    expect(html).toContain("<title>Something went wrong</title>");
    expect(html).toContain("We could not process your request. Please try again later.");
    expect(html).toContain(">Try again</button>");
  });

  it("shows the digest of server errors but never the error itself", () => {
    const html = render(Object.assign(new Error("SECRET internal detail"), { digest: "1234567890" }));
    expect(html).toContain("Error code: 1234567890");
    expect(html).not.toContain("SECRET");
  });

  it("shows no error code for browser errors or non-Error values", () => {
    expect(render(new Error("SECRET"))).not.toContain("Error code");
    expect(render("SECRET")).not.toContain("SECRET");
  });
});
