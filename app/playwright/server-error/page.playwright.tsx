// Playwright only (a route only in PLAYWRIGHT=1 builds). An unexpected error while rendering a Server Component.
export const dynamic = "force-dynamic";

export default async function ServerErrorPage(): Promise<never> {
  throw new Error("PLAYWRIGHT-SECRET-SERVER-ERROR");
}
