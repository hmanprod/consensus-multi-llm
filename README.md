# Consensus Multi-LLM

Application web qui orchestre plusieurs modèles LLM pour produire un **consensus B2** : plusieurs analystes répondent indépendamment, un système de consensus compare les avis, détecte accords/désaccords, déclenche éventuellement un round ciblé, puis un arbitre final rédige la synthèse.

Documentation de référence : `docs/plan-implementation-consensus-multi-llm.md`.

## Fonctionnement

Workflow **A0 → A1 → B1 → B2 → B3 → C** :

- **A0** — l'orchestrateur comprend la question et prépare le plan ;
- **A1** — les analystes répondent en parallèle, sans se voir ;
- **B1** — comparaison : convergences, contradictions, idées uniques ;
- **B2** — consensus : score d'accord, confiance, désaccords classés (formulation, hypothèse, factuel, changeant la conclusion) ;
- **B3** — round ciblé (max 1) : seuls les analystes concernés réexaminent un désaccord important ;
- **C** — synthèse finale rédigée par l'arbitre.

## Démarrage

```bash
npm install
npm run dev
```

Ouvrez http://localhost:3000. Par défaut, le **mode démo** est actif (provider `mock`, aucun coût). Pour utiliser de vrais modèles :

1. copiez `.env.example` vers `.env` ;
2. générez une clé de chiffrement : `openssl rand -hex 32` → `ENCRYPTION_KEY` ;
3. ajoutez vos clés API dans la page **Providers** (elles sont chiffrées côté serveur), ou via les variables d'environnement `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, etc.

Une clé enregistrée active le provider correspondant ; les rôles sans clé basculent automatiquement sur le mock.

## Profils

- **Économique** : modèles rapides, sans round ciblé.
- **Équilibré** : diversité de modèles, consensus systématique, round ciblé conditionnel.
- **Personnalisé** : sélection manuelle par rôle (à venir).

## Architecture

| Couche | Choix |
|---|---|
| Frontend / API | Next.js App Router (Server Actions) |
| Orchestrateur | `src/orchestrator` — service métier indépendant |
| Model Gateway | `src/gateway` — adapters OpenAI, Anthropic, Gemini, OpenRouter, mock |
| Contrats | `src/contracts` — types TypeScript partagés |
| Données | Neon PostgreSQL + Prisma (store Prisma, fallback mémoire si pas de `DATABASE_URL`) |
| Sécurité | Chiffrement AES-256-GCM des clés API (`src/lib/crypto.ts`) |
| Auth | Clerk (MVP, à brancher) |

## Commandes

```bash
npm run dev        # serveur de développement
npm run build      # build de production
npm run lint       # ESLint
npx tsc --noEmit   # typecheck
npx tsx scripts/test-engine.ts  # test du moteur en mode mock
```