# Consensus Multi-LLM

Application web qui orchestre plusieurs modèles LLM pour produire une synthèse multi-analyses : un orchestrateur produit une analyse initiale, plusieurs analystes répondent indépendamment, l'orchestrateur consolide leurs réponses, les analystes les révisent, puis une synthèse finale est générée.

Documentation de référence : `docs/plan-implementation-consensus-multi-llm.md`.

## Fonctionnement

Workflow actuellement implémenté **A → B → S → R → F** :

- **A** — l'orchestrateur produit une analyse indépendante initiale ;
- **B** — les analystes produisent leurs analyses en parallèle, sans se voir ;
- **S** — l'orchestrateur consolide séquentiellement l'analyse A et les analyses B ;
- **R** — les analystes révisent leur analyse à partir de la consolidation ;
- **F** — l'orchestrateur produit la synthèse finale et le rapport structuré.

Le workflow cible historique **A0 → A1 → B1 → B2 → B3 → C** reste documenté comme évolution future. La comparaison B1, le consensus B2 explicite et le round ciblé B3 ne sont pas encore des étapes distinctes du moteur actuel.

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
- **Équilibré** : diversité de modèles et consolidation systématique.
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
