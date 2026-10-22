import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // Multi-file schema: pointing at the directory reads every .prisma file under it.
  // (Pointing at a file reads only that file, and the other models silently drop out.)
  schema: "prisma",
  migrations: {
    // Must sit at the same level as schema.prisma (the datasource block).
    path: "prisma/migrations",
  },
  datasource: {
    // CLI-only connection (migrate and others): the session pooler (5432), not the transaction pooler (6543).
    // The `env()` helper throws when unset, which would also break `prisma generate` (postinstall) in hosted
    // builds without DIRECT_URL, so read process.env directly.
    url: process.env["DIRECT_URL"],
  },
});
