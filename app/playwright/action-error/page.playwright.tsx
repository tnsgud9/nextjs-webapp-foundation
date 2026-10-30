// Playwright only (a route only in PLAYWRIGHT=1 builds). Submitting makes the Server Action fail unexpectedly.
"use client";

import { useActionState } from "react";
import { failAction } from "./actions";

export default function ActionErrorPage() {
  const [, formAction] = useActionState(failAction, null);
  return (
    <form action={formAction}>
      <button type="submit">Submit</button>
    </form>
  );
}
