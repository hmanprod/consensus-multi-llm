# AGENTS.md — Consensus Multi-LLM

Instructions de travail pour les agents IA sur ce projet.

## Vue d'ensemble

Application web qui orchestre plusieurs modèles LLM pour produire une synthèse multi-analyses : un orchestrateur produit une analyse initiale, plusieurs analystes répondent indépendamment, l'orchestrateur consolide leurs réponses, les analystes les révisent, puis une synthèse finale est générée.

Doc de référence : `docs/plan-implementation-consensus-multi-llm.md` (plan de référence et distinction entre cible et implémentation actuelle).

## État actuel

- **Phase 0 — Cadrage** : plan d'implémentation validé.
- **Phase 1 — Moteur technique** : implémenté (Model Gateway + adapters OpenAI/Anthropic/Gemini/OpenRouter, orchestrateur A→B→S→R→F, budget/coûts, timeline).
- **Phase 2 — MVP** : en cours — UI chat style Notion + server actions, store Prisma avec fallback mémoire, chiffrement AES-256-GCM des clés API, pages Providers / Configurations / Paramètres, Clerk obligatoire (les pages exigent une authentification et bloquent avec une notification si Clerk n'est pas configuré).
- Plus aucun mode démo ni provider `mock` : sans clé API pour un provider utilisé par la configuration active, les analyses sont bloquées (bannière persistante + composer désactivé) tant que la clé n'est pas enregistrée.
- La prochaine étape recommandée : appliquer la migration Neon (`npx prisma migrate deploy`) et configurer Clerk (dashboard + env).

## Décisions structurantes (à respecter)

- Orchestrateur **configurable** comme composant central.
- Modèles interchangeables par rôle configuré (orchestrateur, analystes, consensus et synthèse ; les rôles critique et ciblé sont réservés aux évolutions du workflow).
- Workflow actuel : **A** analyse orchestrateur → **B** analyses parallèles → **S** consolidation → **R** révisions parallèles → **F** synthèse finale.
- Le rapport structuré de la synthèse contient accords, désaccords, limites et prochaine étape, mais B1/B2/B3 ne sont pas encore des étapes autonomes.
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
- `npx tsx scripts/test-engine.ts` — test du moteur (workflow complet, clés API requises)
- `npx tsx scripts/test-research.ts` — test des contrats recherche + agent analyste (clés API requises)
- `npx tsx scripts/benchmark.ts --limit=10` — benchmark des variantes recherche (rapports dans `benchmark-results/`, corpus dans `corpus/questions.ts`)

## Pour démarrer

1. Consulter `docs/plan-implementation-consensus-multi-llm.md` et vérifier les écarts avec le code.
2. Pour faire évoluer le moteur, produire ou mettre à jour la spécification technique (contrats, schéma de données, routes serveur et maquettes).
3. Implémenter séparément les étapes B1, B2 et B3 si cette évolution est validée.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
