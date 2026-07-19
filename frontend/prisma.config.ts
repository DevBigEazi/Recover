import path from "node:path";
import { defineConfig } from "prisma/config";

// Load environment variables natively to support Prisma CLI
try {
  process.loadEnvFile(".env.local");
} catch {
  try {
    process.loadEnvFile(".env");
  } catch {
    // Fallback if environment is already configured in shell
  }
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
});
