import dotenv from "dotenv";

dotenv.config({ path: ".env" });
dotenv.config({ path: ".env.local", override: true });

const PROVIDER = "zenmux";
const MODEL = process.argv[2] ?? "google/gemini-3.7-flash";
const BASE_URL = "https://zenmux.ai/api/v1";

async function resolveApiKey(): Promise<string | null> {
  if (process.env.ZENMUX_API_KEY) {
    console.log(`> ZENMUX_API_KEY trouvée dans l'environnement (tail …${process.env.ZENMUX_API_KEY.slice(-4)})`);
    return process.env.ZENMUX_API_KEY;
  }
  const { getPrisma } = await import("../src/lib/db");
  const { decryptSecret } = await import("../src/lib/crypto");
  const prisma = getPrisma();
  try {
    const prov = await prisma.provider.findUnique({ where: { slug: PROVIDER } });
    if (!prov) {
      console.log("> Aucune clé en base (provider zenmux absent) ni dans l'environnement.");
      return null;
    }
    const creds = await prisma.credential.findMany({ where: { providerId: prov.id } });
    for (const c of creds) {
      try {
        const key = decryptSecret(c.encryptedKey, c.keyIv ?? "");
        console.log(`> Clé decryptée depuis la base (user ${c.userId}, tail …${key.slice(-4)})`);
        return key;
      } catch (e) {
        console.log(`> Échec decrypt pour user ${c.userId}: ${(e as Error).message}`);
      }
    }
  } catch (e) {
    console.log(`> Base inaccessible: ${(e as Error).message}`);
  }
  return null;
}

async function main() {
  const apiKey = await resolveApiKey();
  if (!apiKey) {
    console.error("Aucune clé ZenMux disponible (env ni base).");
    process.exit(1);
  }

  const { setGatewayContext } = await import("../src/gateway");
  const { generate } = await import("../src/gateway");
  setGatewayContext({
    async getApiKey(provider) {
      return provider === PROVIDER ? apiKey : null;
    },
  });

  console.log(`\n=== 1. Liste des modèles disponibles (GET ${BASE_URL}/models) ===`);
  const res = await fetch(`${BASE_URL}/models`, {
    headers: { Authorization: `Bearer ${apiKey}` },
    signal: AbortSignal.timeout(20_000),
  });
  console.log(`HTTP ${res.status}`);
  if (!res.ok) {
    console.log(`Corps: ${(await res.text()).slice(0, 400)}`);
  } else {
    const data = (await res.json()) as { data?: Array<{ id?: string }> };
    const ids = (data.data ?? []).map((m) => m.id ?? "");
    const hits = ids.filter((id) => id.includes("gemini"));
    console.log(`Modèle(s) "gemini" proposés par ZenMux:`);
    for (const id of hits) console.log(`  - ${id}`);
    const exact = hits.find((id) => id === MODEL);
    console.log(`\nRecherche exacte de "${MODEL}": ${exact ? "TROUVÉ ✓" : "INTROUVABLE ✗"}`);
  }

  console.log(`\n=== 2. Appel generate() sur ${PROVIDER}/${MODEL} ===`);
  try {
    const result = await generate({
      spec: { provider: PROVIDER, model: MODEL },
      messages: [
        { role: "system", content: "Tu es un assistant de test. Réponds en une phrase." },
        { role: "user", content: "Salut ! Réponds simplement OK." },
      ],
      temperature: 0,
      maxTokens: 64,
      timeoutMs: 60_000,
    });
    console.log(`✓ Succès (${result.latencyMs}ms, ${result.usage.promptTokens}+${result.usage.completionTokens} tokens)`);
    console.log(`  Réponse: ${result.text.slice(0, 200)}`);
  } catch (e) {
    console.error(`✗ Échec: ${(e as Error).message}`);
    process.exitCode = 1;
  }

  await import("../src/lib/db").then(async ({ getPrisma }) => {
    await getPrisma().$disconnect().catch(() => {});
  });
}

main();