# Plan d’implémentation — Consensus Multi-LLM

> **État au 18 août 2026.** Ce document décrit la cible fonctionnelle historique. Le moteur actuellement implémenté suit `A → B → S → R → F` : analyse initiale de l’orchestrateur, analyses parallèles, consolidation, révisions parallèles, puis synthèse finale. Les étapes B1 (comparaison), B2 (consensus explicite) et B3 (round ciblé) décrites ci-dessous restent à implémenter comme étapes distinctes.

**Statut :** plan soumis à validation avant développement  
**Date :** 16 août 2026

## 1. Décisions structurantes

- L’application est pilotée par un **orchestrateur configurable**.
- Les modèles sont interchangeables par rôle : orchestrateur, analystes, critique, consensus B2 et synthèse finale.
- Le consensus est une étape explicite **B2**.
- **Neon PostgreSQL** est utilisé comme base de données, avec Prisma.
- **Clerk** est utilisé pour l’authentification du MVP.
- L’interface est minimaliste, moderne et inspirée de Notion.
- Les clés API sont chiffrées côté serveur.

## 2. Objectifs du MVP

L’utilisateur doit pouvoir :

1. créer un compte et se connecter ;
2. connecter une clé API ;
3. choisir une configuration Économique, Équilibrée ou Personnalisée ;
4. poser une question ;
5. voir les analyses multi-modèles progresser ;
6. consulter le consensus B2 ;
7. comprendre pourquoi un round supplémentaire est déclenché ;
8. recevoir une synthèse finale ;
9. voir le coût estimé et le coût réel ;
10. remplacer un modèle par rôle sans modifier le code.

## 3. Architecture cible

```text
Interface Next.js
        │
        ▼
API applicative / Server Actions
        │
        ▼
Orchestrateur configurable
        │
        ├── Analyses indépendantes
        ├── Comparaison B1
        ├── Consensus B2
        ├── Round ciblé éventuel
        └── Synthèse finale
        │
        ▼
Model Gateway provider-agnostic
        │
        ├── OpenAI
        ├── Gemini
        ├── Anthropic
        ├── Kimi / GLM / DeepSeek
        └── OpenRouter ou modèles locaux
```

### Composants

| Couche | Responsabilité | Choix initial |
|---|---|---|
| Frontend | Chat, onboarding, configuration, suivi | Next.js App Router |
| API | Sessions, conversations, configurations | Routes/Server Actions Next.js |
| Orchestrateur | Planification, appels, rounds, arrêt, budget | Service métier indépendant |
| Model Gateway | Contrat uniforme pour les providers | Adapters indépendants |
| Données | Utilisateurs, messages, exécutions, coûts | Neon PostgreSQL + Prisma |
| Authentification | Connexion, sessions, protection des routes | Clerk |
| Hébergement | Déploiement et secrets d’environnement | Vercel |

## 4. Orchestrateur

L’orchestrateur est le cerveau du système. Il ne doit pas être confondu avec le modèle de consensus ou l’arbitre final.

Il est responsable de :

- comprendre la demande et son niveau de complexité ;
- sélectionner les modèles et les rôles ;
- lancer les analyses en parallèle ;
- transmettre les résultats aux étapes suivantes ;
- déclencher B2 ;
- décider si un round ciblé est nécessaire ;
- contrôler les limites de coût, de durée et de nombre de rounds ;
- demander la synthèse finale ;
- enregistrer l’exécution complète.

L’orchestrateur lui-même est configurable : l’utilisateur choisit le modèle utilisé pour ce rôle indépendamment des autres rôles.

## 5. Workflow fonctionnel

| Étape | Fonction |
|---|---|
| **A0 — Compréhension** | L’orchestrateur classe la question, estime la complexité et prépare le plan. |
| **A1 — Analyses indépendantes** | Les analystes répondent sans voir les contributions des autres. |
| **B1 — Comparaison** | Le système identifie convergences, contradictions et informations uniques. |
| **B2 — Consensus** | Le système évalue les accords, désaccords, risques et prochaine action. |
| **B3 — Round ciblé** | Seuls les modèles concernés réexaminent un désaccord important. |
| **C — Synthèse finale** | L’arbitre final produit une réponse claire et nuancée. |

### Consensus B2

B2 ne doit pas être un simple vote ou score de similarité. Il doit distinguer :

- une différence de formulation ;
- un désaccord sur une hypothèse ;
- un désaccord factuel ;
- un désaccord qui change réellement la conclusion.

La sortie B2 doit contenir :

- un statut : consensus atteint, consensus partiel, désaccord important, informations insuffisantes ou budget dépassé ;
- un score d’accord ;
- un niveau de confiance ;
- les points d’accord ;
- les points de désaccord et les modèles concernés ;
- les informations manquantes ;
- une action recommandée.

Le MVP autorise **un seul round ciblé maximum**. Si le budget est dépassé ou si le désaccord persiste, la synthèse finale doit expliciter les limites.

## 6. Rôles et configurations

| Rôle | Mission | Choix utilisateur |
|---|---|---|
| Orchestrateur | Pilote le workflow et les décisions | Oui |
| Analyste | Produit une analyse indépendante | Oui, plusieurs modèles |
| Critique | Cherche erreurs, biais et omissions | Oui |
| Consensus B2 | Compare les avis et recommande l’action | Oui |
| Synthèse finale | Rédige la réponse définitive | Oui |

Profils de configuration :

- **Économique** : modèles rapides, peu de rounds, arbitre économique.
- **Équilibré** : diversité de modèles, consensus systématique, round ciblé conditionnel.
- **Personnalisé** : sélection manuelle par rôle, budget et seuils de consensus.

## 7. Model Gateway

L’orchestrateur ne doit jamais appeler directement un fournisseur. Il utilise une interface interne commune, par exemple :

```text
validateCredentials()
listModels()
generate()
stream()
estimateCost()
getUsage()
```

Chaque adaptateur normalise :

- le format des messages ;
- le streaming ;
- les réponses structurées ;
- l’usage des tokens ;
- les erreurs ;
- la latence ;
- le calcul du coût.

Cela permet de remplacer Kimi, GLM, Gemini, OpenAI ou tout autre modèle uniquement par configuration.

## 8. Données et Neon

Neon héberge la base PostgreSQL. Prisma fournit le schéma, les migrations et l’accès typé aux données.

Entités principales :

- `User` et `Workspace` ;
- `Provider` et `Model` ;
- `Credential` ;
- `OrchestrationConfiguration` ;
- `Conversation` et `Message` ;
- `WorkflowRun` ;
- `ModelInvocation` ;
- `ConsensusReport`.

Les identifiants Clerk sont associés aux utilisateurs applicatifs. Clerk ne stocke pas les conversations ni les clés API.

## 9. Authentification et onboarding

Clerk est retenu pour le MVP afin d’éviter de développer et maintenir nous-mêmes les sessions, cookies sécurisés, vérifications d’email, réinitialisation de mot de passe et protections de connexion.

Parcours recommandé :

1. créer un compte ou se connecter avec email/Google ;
2. choisir un fournisseur ;
3. coller la clé API dans un champ masqué ;
4. tester la connexion ;
5. sélectionner une configuration ;
6. lancer une première question guidée.

Les clés API ne sont jamais stockées dans Clerk. Elles sont chiffrées côté serveur et déchiffrées uniquement au moment de l’appel au provider.

## 10. UX/UI

Principes :

- navigation latérale discrète ;
- typographie lisible ;
- espace blanc généreux ;
- couleurs limitées ;
- boutons peu nombreux ;
- progression visible mais non technique ;
- détails avancés accessibles à la demande.

### Direction design « inspirée de Notion »

Le style vise un rendu **propre, moderne et user-friendly**, à la manière de Notion :

- interface sobre et épurée, sans effets superflus ;
- sidebar discrète à gauche pour la navigation et les conversations récentes ;
- typographie sans-serif lisible (hiérarchie claire : titres, corps, captions) ;
- fond neutre, peu de couleurs d'accent, utilisées avec parcimonie (une seule couleur d'action) ;
- espacement généreux et grilles simples ;
- cartes et panneaux avec bordures fines et ombres subtiles ;
- état de traitement discret et non technique (spinner, étape en cours) ;
- densité d'information modérée : l'essentiel d'abord, les détails avancés (modèles, coûts, consensus) repliés dans un panneau secondaire.

Référence de ton : Notion, Linear ou Slack (sobriété, confort de lecture, navigation latérale).

Écrans MVP :

- accueil et conversations récentes ;
- chat ;
- onboarding providers ;
- configurations d’orchestration ;
- paramètres et gestion des credentials.

Dans le chat, l’utilisateur voit principalement la question, le statut du traitement, la réponse finale et la zone de saisie. Un panneau secondaire permet d’afficher les modèles, contributions, accords, désaccords, rounds et coûts.

## 11. Sécurité

- isolation stricte des données par utilisateur et workspace ;
- chiffrement des credentials au repos ;
- aucune clé API dans les logs ou réponses ;
- validation côté serveur des configurations et autorisations ;
- liste blanche pour les outils externes ;
- protection contre les instructions malveillantes dans les réponses de modèles ;
- suppression et export des données prévus dans le modèle de données ;
- quotas et limites par utilisateur.

## 12. Contrôle des coûts

- estimation avant exécution ;
- budget maximal par workflow ;
- limite de tokens ;
- timeout par appel ;
- nombre maximal de rounds ;
- exécution parallèle ;
- résumés entre les rounds ;
- round ciblé plutôt que relance globale ;
- modèle premium uniquement si le désaccord le justifie ;
- coût réel enregistré par invocation.

Affichage recommandé :

```text
Coût estimé : 0,03 à 0,08 €
Modèles : 4
Rounds maximum : 2

Coût réel : 0,046 €
Durée : 18 secondes
Appels : 7
```

## 13. Observabilité

La timeline actuelle doit refléter `A → B → S → R → F`. L’exemple `A0 → A1 → B1 → B2 → B3 → C` ci-dessous représente la cible après implémentation des étapes de comparaison, consensus et round ciblé.

Chaque workflow doit produire une timeline :

```text
A analyse orchestrateur terminé — 1,2 s
B analyses              3 appels parallèles — 8,4 s
S consolidation         terminée — 2,1 s
R révisions             3 appels parallèles — 5,6 s
F synthèse finale       terminée — 2,8 s
```

Métriques à suivre : durée, tokens, coût par modèle, erreurs, retries, fallbacks, nombre de rounds, score de consensus, taux d’arrêt précoce et feedback utilisateur.

## 14. Phases de réalisation

### Phase 0 — Cadrage

Contrats TypeScript, workflow, maquettes, schéma de données, règles de budget et critères de réussite.

### Phase 1 — Moteur technique

Model Gateway, premiers adapters, appels parallèles, comparaison, B2, round ciblé et logs.

### Phase 2 — MVP utilisable

Clerk, Neon, Prisma, chat, onboarding API keys, configurations, streaming, coûts et gestion des erreurs.

### Phase 3 — UX avancée

Profils, modèles favoris, rôles personnalisés, prompts, détails du consensus et exports.

### Phase 4 — Production

Quotas, reprise après interruption, observabilité renforcée, tests de charge, sécurité et optimisation des coûts.

## 15. Stratégie de tests

### Tests unitaires

Sélection des modèles, validation des configurations, budget, coûts, statuts B2, retries, timeouts et arrêt des workflows.

### Tests des adapters

Clé valide, clé invalide, timeout, rate limit, réponse vide, contexte trop long, streaming et usage des tokens.

### Tests d’intégration

- consensus immédiat ;
- désaccord nécessitant B2 ;
- round ciblé ;
- provider indisponible ;
- budget dépassé ;
- arrêt manuel ;
- reprise après interruption ;
- modèle supprimé ou indisponible.

### Tests UX et qualité

Tester l’onboarding, la configuration, la lecture des étapes, l’accessibilité, le mobile et un jeu de questions couvrant raisonnement, programmation, analyse, ambiguïté et sujets sensibles.

Les tests automatisés utilisent des mocks pour éviter les coûts API. Un jeu d’évaluation réel sera utilisé séparément pour mesurer qualité, coût et latence.

## 16. Périmètre MVP

### Inclus

- application web ;
- Clerk ;
- Neon + Prisma ;
- trois providers maximum au démarrage ;
- trois analystes maximum ;
- consensus B2 ;
- un round ciblé ;
- synthèse finale ;
- profils Économique, Équilibré et Personnalisé ;
- coûts, logs et erreurs.

### Reporté

- modèles locaux ;
- recherche web avancée ;
- fichiers et vision ;
- équipes et collaboration ;
- facturation ;
- marketplace de configurations ;
- API publique ;
- agents autonomes.

## 17. Validation avant développement

Les éléments suivants doivent être validés avant le démarrage du code :

1. Neon PostgreSQL + Prisma ;
2. Clerk pour l’authentification du MVP ;
3. orchestrateur configurable comme composant central ;
4. workflow A0, A1, B1, B2, B3 et C ;
5. un seul round ciblé maximum ;
6. trois providers maximum au premier lancement ;
7. chiffrement serveur des clés API ;
8. profils Économique, Équilibré et Personnalisé ;
9. interface simple inspirée de Notion.

### Étape suivante recommandée

Après validation de ce plan, produire la spécification technique du MVP : arborescence, contrats TypeScript du Model Gateway, schéma Prisma, routes serveur et maquettes des écrans principaux. Aucun développement fonctionnel n’est engagé avant cette validation.
