import path from "node:path";
import { defineConfig } from "prisma/config";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    // Connection URL for Migrate — moved here from schema.prisma as required by Prisma 6+
    url: `file:${path.join(process.cwd(), "prisma", "dev.db")}`,
  },
});
