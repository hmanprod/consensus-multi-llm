import "dotenv/config";
import dotenv from "dotenv";
import { existsSync } from "node:fs";
import { defineConfig } from "prisma/config";

if (existsSync(".env.local")) dotenv.config({ path: ".env.local", override: true });

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