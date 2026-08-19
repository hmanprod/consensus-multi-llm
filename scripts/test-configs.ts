import { ensureUserSetup } from "../src/lib/setup";
import { getStore } from "../src/lib/store";
import { getProfile } from "../src/config/profiles";

async function main() {
  await ensureUserSetup();

  const store = await getStore();
  let configs = await store.listConfigs();
  console.log("1. configs initiales:", configs.map((c) => `${c.name} [${c.id}]`));

  const ref = await store.getActiveConfig();
  console.log("2. active ref:", JSON.stringify(ref), "→ type:", ref.type);

  if (ref.type !== "saved") throw new Error("active ref non migrée vers saved");

  const created = await store.saveConfig("Recherche approfondie", "custom", {
    ...getProfile("best"),
    profile: "custom",
    search: true,
  });
  console.log("3. création:", created.name, created.id);

  const updated = await store.updateConfig(created.id, { name: "Recherche approfondie v2" });
  console.log("4. rename:", updated.name);

  const updatedCfg = await store.updateConfig(created.id, {
    config: { ...created.config, maxRounds: 2, orchestrator: { provider: "openrouter", model: "openai/gpt-5.6" } },
  });
  console.log("5. update config:", updatedCfg.config.maxRounds, JSON.stringify(updatedCfg.config.orchestrator));

  const duplicate = await store.saveConfig(`${updatedCfg.name} (copie)`, "custom", updatedCfg.config);
  console.log("6. duplicata:", duplicate.name);

  const active = await store.getActiveConfig();
  console.log("7. active avant suppression:", JSON.stringify(active));

  configs = await store.listConfigs();
  console.log("8. nb configs:", configs.length);

  const missing = await store.getConfig("inexistant");
  console.log("9. getConfig inexistant:", missing);

  console.log("OK");
}

main().catch((e) => {
  console.error("ERREUR:", e);
  process.exit(1);
});
