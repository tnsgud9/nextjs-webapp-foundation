// Playwright only (a route only in PLAYWRIGHT=1 builds). A page that requires sign-in.
import { requirePageUser } from "@/lib/auth";

export default async function ProtectedPage() {
  const user = await requirePageUser();
  return <p>{user.id}</p>;
}
