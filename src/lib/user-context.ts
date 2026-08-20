import { AsyncLocalStorage } from "async_hooks";

export const userStorage = new AsyncLocalStorage<string>();

export function currentUserId(): string {
  const id = userStorage.getStore();
  if (!id) throw new Error("user_context_missing");
  return id;
}

export function authEnabled(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY && process.env.CLERK_SECRET_KEY
  );
}

export async function requireAuth(): Promise<string> {
  if (!authEnabled()) throw new Error("auth_not_configured");
  const { auth } = await import("@clerk/nextjs/server");
  const { userId } = await auth();
  if (!userId) throw new Error("unauthorized");
  return userId;
}

export async function getAuthUserId(): Promise<string> {
  return requireAuth();
}