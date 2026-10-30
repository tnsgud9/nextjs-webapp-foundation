// Playwright only (a route only in PLAYWRIGHT=1 builds). Shows a toast through the app-wide Toaster.
"use client";

import { toast } from "@/components/ui/toast";

export default function ToastPage() {
  return (
    <button type="button" onClick={() => toast.add({ title: "Saved", description: "The change was saved." })}>
      Save
    </button>
  );
}
