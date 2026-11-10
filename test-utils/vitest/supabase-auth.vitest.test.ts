import { describe, expect, it, vi } from "vitest";
import { fakeSupabaseAuth } from "./supabase-auth";

const auth = fakeSupabaseAuth();
const USER = { sub: "11111111-1111-1111-1111-111111111111", email: "user@example.com" };

describe("fakeSupabaseAuth", () => {
  it("signs a requester in and out for a module loaded with load()", async () => {
    const { getCurrentUser } = await auth.load(() => import("@/lib/auth"));
    auth.signIn(USER);
    await expect(getCurrentUser()).resolves.toMatchObject({ id: USER.sub });

    auth.signOut();
    const reloaded = await auth.load(() => import("@/lib/auth"));
    await expect(reloaded.getCurrentUser()).resolves.toBeNull();
  });

  it("sees every caller as signed out in a module imported without load(), since Supabase is off in tests", async () => {
    auth.signIn(USER);
    vi.resetModules(); // as a static import at the top of a test file would load it
    const { getCurrentUser } = await import("@/lib/auth");
    await expect(getCurrentUser()).resolves.toBeNull();
  });
});
