# AGENTS.md — Consensus Multi-LLM

Instructions de travail pour les agents IA sur ce projet.

## Vue d'ensemble

Application web qui orchestre plusieurs modèles LLM pour produire un **consensus B2** : plusieurs analystes répondent indépendamment, un système de consensus compare les avis, détecte accords/désaccords, déclenche éventuellement un round ciblé, puis un arbitre final rédige la synthèse.

Doc de référence : `docs/plan-implementation-consensus-multi-llm.md` (plan soumis à validation, aucun développement fonctionnel engagé).

## État actuel

- **Phase 0 — Cadrage** : plan d'implémentation validé.
- **Phase 1 — Moteur technique** : implémenté (Model Gateway + adapters OpenAI/Anthropic/Gemini/OpenRouter/mock, orchestrateur A0→A1→B1→B2→B3→C, budget/coûts, timeline).
- **Phase 2 — MVP** : en cours — UI chat style Notion + server actions, store Prisma avec fallback mémoire, chiffrement AES-256-GCM des clés API, pages Providers / Configurations / Paramètres, Clerk scaffoldé (env-gated : actif si `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` + `CLERK_SECRET_KEY`, données liées à l'utilisateur via AsyncLocalStorage).
- Mode démo par défaut (provider `mock`, aucun coût) tant qu'aucune clé API n'est configurée ; une clé enregistrée active le provider correspondant.
- La prochaine étape recommandée : appliquer la migration Neon (`npx prisma migrate deploy`) et configurer Clerk (dashboard + env).

## Décisions structurantes (à respecter)

- Orchestrateur **configurable** comme composant central.
- Modèles interchangeables par rôle (orchestrateur, analystes, critique, consensus B2, synthèse finale).
- Workflow : **A0** compréhension → **A1** analyses parallèles → **B1** comparaison → **B2** consensus → **B3** round ciblé (max 1) → **C** synthèse finale.
- B2 n'est pas un simple vote : il distingue formulation, hypothèse, désaccord factuel et désaccord qui change la conclusion.
- **Neon PostgreSQL + Prisma** pour les données.
- **Clerk** pour l'authentification (MVP).
- **Model Gateway provider-agnostic** : l'orchestrateur n'appelle jamais directement un fournisseur.
- Clés API chiffrées côté serveur, jamais stockées dans Clerk.
- UI minimaliste inspirée de Notion : sobriété, sidebar latérale, typographie lisible, couleurs rares, détails avancés repliés (détail dans le plan, section 10).
- 3 providers max, 3 analystes max au MVP.
- Budget et coûts contrôlés : estimation avant exécution, budget max, limites de tokens, timeouts, coût réel enregistré par invocation.

## Stack cible

| Couche | Choix |
|---|---|
| Frontend / API | Next.js App Router (Server Actions) |
| Orchestrateur | Service métier indépendant |
| Model Gateway | Adapters par provider (OpenAI, Gemini, Anthropic, Kimi/GLM/DeepSeek, OpenRouter) |
| Données | Neon PostgreSQL + Prisma |
| Auth | Clerk |
| Hébergement | Vercel |

## Conventions

- Documentation en **français** ; code (identifiants, messages, erreurs) en **anglais**.
- TypeScript strict, contrats typés partagés.
- L'orchestrateur ne dépend jamais directement d'un SDK provider : toujours via l'interface du Model Gateway.
- Validation serveur systématique des configurations et autorisations.
- Aucune clé API dans les logs, réponses ou erreurs.
- Pas de développement fonctionnel avant la validation du plan et de la spécification technique.

## Commandes

Outilillage installé (scaffold Next.js 16 + Prisma 7) :

- `npm run dev` — serveur de développement (http://localhost:3000)
- `npm run build` — build de production
- `npm run start` — lance le build de production
- `npm run lint` — ESLint
- `npx tsc --noEmit` — typecheck TypeScript
- `npx prisma generate` — régénère le client Prisma
- `npx tsx scripts/test-engine.ts` — test du moteur (workflow complet en mode mock)

## Pour démarrer

1. Valider le plan dans `docs/plan-implementation-consensus-multi-llm.md`.
2. Produire la spécification technique (arborescence, contrats TypeScript du Model Gateway, schéma Prisma, routes serveur, maquettes).
3. Implémenter Phase 1 — Moteur technique (Model Gateway, adapters, appels parallèles, B1, B2, round ciblé).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
