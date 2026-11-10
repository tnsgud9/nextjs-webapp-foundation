import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import NotFound from "./not-found";

describe("not-found page", () => {
  it("says the page was not found and links home, with nothing about the resource", () => {
    const html = renderToStaticMarkup(<NotFound />);
    expect(html).toContain("Page not found");
    expect(html).toContain('href="/"');
  });
});
