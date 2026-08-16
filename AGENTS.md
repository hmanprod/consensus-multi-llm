# AGENTS.md — Consensus Multi-LLM

Instructions de travail pour les agents IA sur ce projet.

## Vue d'ensemble

Application web qui orchestre plusieurs modèles LLM pour produire un **consensus B2** : plusieurs analystes répondent indépendamment, un système de consensus compare les avis, détecte accords/désaccords, déclenche éventuellement un round ciblé, puis un arbitre final rédige la synthèse.

Doc de référence : `docs/plan-implementation-consensus-multi-llm.md` (plan soumis à validation, aucun développement fonctionnel engagé).

## État actuel

- **Phase 0 — Cadrage** : plan d'implémentation rédigé, pas encore validé.
- Aucun code n'a encore été écrit.
- La prochaine étape recommandée est la **spécification technique** : arborescence, contrats TypeScript du Model Gateway, schéma Prisma, routes serveur, maquettes.

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

Aucun outillage installé pour l'instant. Ajouter ici les commandes de dev/test/lint une fois le projet scaffoldé (Next.js + Prisma).

## Pour démarrer

1. Valider le plan dans `docs/plan-implementation-consensus-multi-llm.md`.
2. Produire la spécification technique (arborescence, contrats TypeScript du Model Gateway, schéma Prisma, routes serveur, maquettes).
3. Implémenter Phase 1 — Moteur technique (Model Gateway, adapters, appels parallèles, B1, B2, round ciblé).