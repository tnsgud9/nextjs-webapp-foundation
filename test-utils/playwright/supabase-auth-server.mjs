// Fake Supabase Auth server that Playwright starts before the app (webServer in playwright.config.ts).
// The first argument is the port. Node only strips TS types, so the shared implementation loads as is.
import { startFakeSupabaseAuth } from "../shared/supabase-auth.ts";

const { url } = await startFakeSupabaseAuth(Number(process.argv[2]));
console.log(`Fake Supabase Auth listening on ${url}`);
