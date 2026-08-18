import "dotenv/config";
import { defineConfig } from "prisma/config";

if (process.env.CI && !process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL environment variable is missing. " +
    "Please add DATABASE_URL to your GitHub repository secrets (Settings > Secrets and variables > Actions)."
  );
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/consensus",
  },
});