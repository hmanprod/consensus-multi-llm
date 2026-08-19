import { getProfile } from "@/config/profiles";
import { getStore, type Store } from "@/lib/store";
import { currentUserId } from "@/lib/user-context";

const ensured = new Map<string, Promise<void>>();

/**
 * Garantit qu'un utilisateur possède au moins une configuration sauvegardée
 * et que la configuration active est une référence `saved`.
 *
 * Migre les anciennes références `profile:economical` / `profile:best` vers
 * une configuration sauvegardée correspondante, créée au besoin.
 * Idempotente et dédupliquée par processus pour éviter les créations concurrentes.
 */
export function ensureUserSetup(): Promise<void> {
  const userId = currentUserId();
  let pending = ensured.get(userId);
  if (!pending) {
    pending = runEnsure();
    ensured.set(userId, pending);
  }
  return pending;
}

async function runEnsure(): Promise<void> {
  const store = await getStore();
  const configs = await store.listConfigs();
  const ref = await store.getActiveConfig();

  if (ref.type === "saved" && configs.some((c) => c.id === ref.id) && configs.length > 0) {
    return;
  }

  let target: Awaited<ReturnType<Store["saveConfig"]>> | undefined;

  if (ref.type === "saved") {
    target = configs.find((c) => c.id === ref.id);
  } else if (configs.length === 0) {
    const name = ref.profile === "best" ? "Configuration approfondie" : "Configuration économique";
    target = await store.saveConfig(name, "custom", getProfile(ref.profile));
  }

  if (!target) target = configs[0];
  if (!target) {
    target = await store.saveConfig("Configuration économique", "custom", getProfile("economical"));
  }

  await store.setActiveConfig({ type: "saved", id: target.id });
}
