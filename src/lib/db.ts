import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  var __consensusPrisma: PrismaClient | undefined;
}

export function isPersistent(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

export function getPrisma(): PrismaClient {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL_not_set");
  if (!globalThis.__consensusPrisma) {
    const adapter = new PrismaPg({ connectionString: url });
    globalThis.__consensusPrisma = new PrismaClient({ adapter });
  }
  return globalThis.__consensusPrisma;
}