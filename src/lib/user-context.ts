import { AsyncLocalStorage } from "async_hooks";

export const userStorage = new AsyncLocalStorage<string>();

export function currentUserId(): string {
  return userStorage.getStore() ?? "demo";
}

export function authEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );
}

export async function getAuthUserId(): Promise<string> {
  if (!authEnabled()) return "demo";
  try {
    const { auth } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    return userId ?? "demo";
  } catch {
    return "demo";
  }
}