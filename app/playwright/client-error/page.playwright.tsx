"use client";

// Playwright only (a route only in PLAYWRIGHT=1 builds). Clicking the button causes a rendering error in the browser.
import { useState } from "react";

export default function ClientErrorPage() {
  const [broken, setBroken] = useState(false);
  if (broken) throw new Error("PLAYWRIGHT-CLIENT-ERROR");
  return (
    <button type="button" onClick={() => setBroken(true)}>
      Throw error
    </button>
  );
}
