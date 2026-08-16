import type { Store } from "./types";

let impl: Store | null = null;

export async function getStore(): Promise<Store> {
  if (impl) return impl;
  const persistent = Boolean(process.env.DATABASE_URL);
  impl = persistent ? (await import("./prisma")).prismaStore : (await import("./memory")).memoryStore;
  return impl;
}

export type {
  Store,
  StoredConfig,
  StoredConversation,
  StoredCredential,
  StoredMessage,
  StoredRun,
} from "./types";