# Plan d’implémentation — MVP recherche multi-agents

## 1. Décision

Le MVP doit intégrer la recherche web. Sans recherche, il ne permettrait pas de valider l’hypothèse principale du produit :

> Des recherches indépendantes menées par plusieurs analystes, puis consolidées progressivement avec leurs preuves, améliorent la qualité d’une synthèse multi-LLM.

Le MVP de recherche doit rester limité et mesurable. Il ne cherche pas encore à reproduire toutes les capacités d’un moteur comme Perplexity. Il doit fournir une première expérience fiable pour tester l’hypothèse.

### Décision d’architecture : runtime Hermès

Le MVP sera construit autour d’un runtime Hermès. Chaque analyste sera une instance isolée d’Hermès, configurée par un manifeste serveur versionné : modèle, skills, instructions, budget et politique de recherche.

Hermès définira la configuration des agents et Open Code sera utilisé comme agent d’exécution pour appliquer les modifications au code source, ajouter les contrats, implémenter les adapters et lancer les vérifications.

## 2. Périmètre du MVP

### Inclus

- recherche web pendant l’analyse initiale des analystes ;
- premier backend de recherche : Gemini API avec Google Search grounding ;
- couche OSINT initiale, limitée à des connecteurs spécialisés sélectionnés selon le domaine ;
- au maximum trois analystes ;
- recherche indépendante par analyste ;
- budget et limites de recherche par workflow ;
- citations et sources conservées avec chaque analyse ;
- consolidation progressive `AB → ABC` ;
- révision des analystes après consolidation ;
- synthèse finale indiquant sources, accords, désaccords et limites ;
- mode démo sans recherche pour les tests locaux sans clé Gemini ;
- journalisation des requêtes, sources, coûts et erreurs sans exposer les clés.
- manifeste serveur des agents Hermès ;
- profils d’agents internes non éditables dans l’interface du MVP.

### Hors périmètre initial

- scraping généraliste avec navigateur headless ;
- plusieurs moteurs de recherche simultanés ;
- sources premium payantes ;
- recherche authentifiée ou derrière paywall ;
- catalogue complet de connecteurs OSINT ;
- recherche autonome illimitée ;
- streaming détaillé de chaque appel outil dans l’interface ;
- comparaison scientifique complète automatisée.
- configuration utilisateur des providers, modèles et profils ;
- marketplace ou création libre de skills.

## 3. Architecture cible du MVP

```text
Question utilisateur
        ↓
Orchestrateur A
  plan de recherche et contraintes
        ↓
Hermès Agent × 1 à 3
  modèle + skills + Research Gateway
        ↓
Dossier analyste structuré
  analyse + affirmations + preuves + limites
        ↓
Consolidation progressive
  A + B → AB
  AB + C → ABC
        ↓
Révisions parallèles
        ↓
Synthèse finale
```

Le workflow métier reste `A → B → S → R → F` :

- `A` : compréhension de la question et plan de recherche ;
- `B` : recherches et analyses indépendantes ;
- `S` : consolidations successives et comparaison des preuves ;
- `R` : révisions des analystes ;
- `F` : synthèse finale.

Les étapes B1, B2 et B3 restent une évolution ultérieure. La consolidation `S` du MVP doit toutefois produire suffisamment d’informations pour mesurer les accords, désaccords et limites.

## 4. Manifeste des agents Hermès

La configuration initiale ne sera pas pilotée par les pages Providers, Configurations ou Profils. Elle sera déclarée côté serveur dans un manifeste versionné et modifiable par l’équipe technique.

```ts
interface HermesAgentDefinition {
  id: string;
  label: string;
  model: ModelSpec;
  skills: string[];
  systemInstructions: string;
  researchPolicy: ResearchPolicy;
}
```

Exemple de configuration initiale :

```text
hermes-explorer
  modèle : Kimi
  skills : web-research, osint-enrichment, evidence-analysis

hermes-critic
  modèle : Claude
  skills : web-research, contradiction-search, primary-source-check

hermes-verifier
  modèle : Gemini
  skills : google-search, news-research, primary-source-check
```

Le manifeste pourra être changé sans exposer une configuration complexe à l’utilisateur final. Les credentials restent nécessaires côté serveur, mais leur gestion est une précondition technique et non une fonctionnalité principale du MVP.

## 5. Choix de la recherche

### Premier backend : Gemini Google Search grounding

Gemini est retenu pour le premier prototype parce que l’API Gemini propose un outil natif `google_search` : le modèle peut générer une ou plusieurs requêtes, interroger Google Search et retourner une réponse accompagnée de citations.

Ce choix réduit le travail initial nécessaire pour construire un moteur de recherche et permet de tester rapidement la valeur de la recherche dans le workflow Consensus.

### Limite de ce choix

Le MVP ne doit pas confondre la réponse Grounded de Gemini avec un accès complet et auditable au contenu HTML des pages. Les métadonnées et citations retournées par Gemini doivent être conservées, mais le système doit signaler lorsqu’une source n’a pas pu être vérifiée directement.

La construction d’un fetcher/extracteur indépendant pourra suivre après validation de l’hypothèse.

### Couche OSINT complémentaire

Le MVP doit prévoir une première couche OSINT, mais pas une couverture universelle. Le moteur généraliste sert à découvrir les pistes ; un connecteur OSINT spécialisé peut ensuite enrichir ou vérifier une information selon le domaine de la question.

```text
Recherche généraliste
  → piste ou entité identifiée
  → connecteur OSINT adapté
  → source primaire ou originale lorsque disponible
  → preuve normalisée
```

Le routeur OSINT doit commencer avec un nombre limité de domaines, par exemple actualités/événements et recherche scientifique. Les autres domaines — entreprises, sanctions, cyber, finance ou géographie — seront ajoutés après benchmark.

Une source officielle ou originale est privilégiée parce qu’elle est la plus proche de l’origine de l’information. Elle n’est pas automatiquement neutre ou exacte. Si elle n’est pas accessible, le système doit l’indiquer et classer l’affirmation comme confirmée par des sources secondaires, non vérifiable directement ou contradictoire.

## 6. Contrats TypeScript à ajouter

Créer des contrats indépendants du fournisseur dans `src/contracts/research.ts`.

```ts
export type ResearchMode = "native-search" | "disabled";

export interface ResearchPolicy {
  enabled: boolean;
  maxSearchesPerAnalyst: number;
  maxSourcesPerAnalyst: number;
  maxResearchTimeMs: number;
  maxResearchCostCents: number;
  freshness?: "any" | "day" | "week" | "month" | "year";
}

export interface ResearchSource {
  id: string;
  url: string;
  title: string;
  domain?: string;
  excerpt?: string;
  publishedAt?: string;
  retrievedAt: string;
  sourceType?: "primary" | "secondary" | "analysis" | "unknown";
}

export interface ResearchQuery {
  query: string;
  analystIndex: number;
  executedAt: string;
}

export interface ResearchEvidence {
  id: string;
  claim: string;
  sourceIds: string[];
  confidence: "low" | "medium" | "high";
}

export interface AnalystDossier {
  analysis: string;
  conclusion: string;
  queries: ResearchQuery[];
  sources: ResearchSource[];
  evidence: ResearchEvidence[];
  uncertainties: string[];
}
```

Modifier ensuite les contrats de workflow afin que chaque `AnalysisOutput` puisse contenir un dossier de recherche optionnel.

## 7. Adaptation du Model Gateway

Le Model Gateway actuel accepte uniquement des messages texte. Il faut ajouter une capacité optionnelle de recherche sans rendre tous les providers dépendants de Gemini.

```ts
export interface ResearchGenerationRequest extends GenerationRequest {
  research?: ResearchPolicy;
}

export interface ResearchGenerationResult extends GenerationResult {
  research?: {
    queries: ResearchQuery[];
    sources: ResearchSource[];
  };
}
```

Deux options sont possibles :

1. ajouter `generateWithResearch()` à l’adapter Gemini ;
2. créer une interface `ResearchAdapter` séparée, appelée par `AnalystAgent`.

Le MVP doit privilégier la seconde option afin que l’orchestrateur ne dépende pas directement du SDK Gemini.

```ts
export interface ResearchAdapter {
  readonly provider: string;
  researchAndGenerate(
    req: ResearchGenerationRequest
  ): Promise<ResearchGenerationResult>;
}
```

## 8. Runtime Hermès et skills

Créer `src/hermes/` et un runtime d’agent indépendant du fournisseur.

Responsabilités du runtime :

- charger une définition d’agent Hermès ;
- exécuter les skills autorisés dans un ordre contrôlé ;
- appeler le Model Gateway et le Research Gateway ;
- maintenir une mémoire de travail isolée par agent ;
- normaliser les citations et produire le dossier analyste ;
- refuser les affirmations sans preuve lorsque la politique l’exige ;
- appliquer les limites de temps, coût et nombre de recherches ;
- retourner une erreur contrôlée si un skill ou une recherche échoue.

Créer au minimum les skills suivants :

- `web-research` ;
- `osint-enrichment` ;
- `primary-source-check` ;
- `contradiction-search` ;
- `evidence-analysis` ;
- `final-analysis`.

Le prompt analyste doit demander une structure explicite :

```text
Analyse la question avec les résultats de recherche disponibles.
Sépare les faits, interprétations, hypothèses et prédictions.
Associe chaque affirmation importante à une ou plusieurs sources.
Signale les informations non vérifiées et les contradictions.
Ne prétends pas avoir consulté une source qui n'est pas fournie.
```

## 9. Intégration au workflow

### Phase A

Conserver l’analyse initiale de l’orchestrateur. Dans le MVP, elle peut rester sans recherche afin de conserver un point de comparaison.

Option recommandée : permettre deux modes expérimentaux :

- orchestrateur sans recherche ;
- orchestrateur avec recherche.

### Phase B

Remplacer l’appel direct des analystes par `HermesRuntime.run()`.

Chaque analyste doit travailler en parallèle avec :

- la même question ;
- une politique de recherche commune ;
- un contexte isolé ;
- un budget individuel ;
- un identifiant d’analyste différent.

Les analystes ne doivent pas voir les requêtes, sources ou dossiers des autres avant la consolidation.

### Phase S

Modifier `consolidationPrompt()` pour fournir les dossiers structurés et demander une consolidation explicite :

- faits confirmés par plusieurs analystes ;
- faits trouvés par un seul analyste ;
- sources contradictoires ;
- affirmations sans preuve suffisante ;
- conclusion provisoire ;
- questions restant à vérifier.

La consolidation doit conserver la provenance des sources au lieu de produire uniquement un texte libre.

### Phase R

Modifier `revisionPrompt()` afin que chaque analyste reçoive :

- son dossier initial ;
- la consolidation ;
- les sources et contradictions détectées ;
- l’instruction de confirmer ou corriger sa position.

Les analystes peuvent recevoir une recherche complémentaire ciblée uniquement si une affirmation importante est insuffisamment étayée. Cette recherche complémentaire doit être limitée à un seul mini-round dans le MVP.

### Phase F

La synthèse finale doit inclure :

- recommandation ;
- résumé ;
- points d’accord ;
- points de désaccord importants ;
- limites et incertitudes ;
- sources principales ou citations associées.

## 10. Budget et limites MVP

Valeurs initiales proposées, à ajuster après mesure :

```ts
const defaultResearchPolicy: ResearchPolicy = {
  enabled: true,
  maxSearchesPerAnalyst: 5,
  maxSourcesPerAnalyst: 8,
  maxResearchTimeMs: 30_000,
  maxResearchCostCents: 20,
  freshness: "any",
};
```

Le budget total du workflow doit intégrer :

- tokens du modèle ;
- recherches facturées par le provider ;
- éventuels appels complémentaires ;
- coût réel par analyste ;
- coût total du run.

Le run doit s’arrêter proprement si le budget est dépassé et indiquer la cause dans la timeline.

## 11. Persistance et observabilité

Ajouter, si nécessaire, des champs ou tables Prisma pour conserver :

- les requêtes exécutées ;
- les sources retournées ;
- les citations ;
- les preuves associées aux affirmations ;
- le provider utilisé ;
- le coût de recherche ;
- les erreurs et timeouts.

Les clés API et données sensibles ne doivent jamais apparaître dans les logs.

La timeline doit évoluer vers :

```text
A plan de recherche             terminé
B recherches analystes          3 appels parallèles
S consolidation AB/ABC          terminé
R révisions                      3 appels parallèles
F synthèse finale                terminé
```

## 12. Interface MVP

L’interface doit afficher simplement :

- recherche activée ou désactivée ;
- nombre d’analystes ;
- nombre de sources utilisées ;
- état de la recherche ;
- citations dans les analyses et la synthèse ;
- limites ou sources inaccessibles ;
- coût et durée estimés/réels.

Les détails des requêtes et sources peuvent être repliés dans le panneau de workflow.

## 13. Plan de réalisation

### Lot 1 — Manifeste Hermès et contrats

- créer `src/contracts/research.ts` ;
- créer `src/contracts/hermes.ts` ;
- créer le manifeste serveur des agents Hermès ;
- définir les trois agents initiaux et leurs skills ;
- décider les modèles par environnement sans exposition dans l’interface ;
- définir les règles de budget et timeout ;
- écrire les tests de validation des limites ;
- faire appliquer ces contrats et manifestes par Open Code dans le dépôt.

### Lot 2 — Adapter Gemini Search

- intégrer le SDK ou l’API Gemini officielle côté serveur ;
- activer `google_search` ;
- extraire les étapes de recherche et annotations ;
- normaliser les sources et citations ;
- gérer les réponses non grounded et les erreurs ;
- ajouter un test d’intégration avec clé configurée.

### Lot 3 — Routeur OSINT et vérification

- créer une interface `OSINTConnector` indépendante du fournisseur ;
- créer un routeur qui sélectionne le connecteur selon le domaine de la question ;
- intégrer au maximum deux connecteurs au premier passage, par exemple actualités/événements et recherche scientifique ;
- normaliser les résultats OSINT dans `ResearchSource` et `ResearchEvidence` ;
- ajouter la recherche de source primaire ou originale lorsque le connecteur ou le Web le permet ;
- marquer explicitement les affirmations sans vérification primaire ;
- tester les réponses sans source primaire, avec sources secondaires contradictoires et avec source inaccessible.

### Lot 4 — Runtime Hermès et skills

- créer `src/hermes/runtime.ts` ;
- charger une définition d’agent Hermès ;
- créer la mémoire de travail isolée par agent ;
- créer les skills `web-research`, `osint-enrichment`, `primary-source-check`, `contradiction-search`, `evidence-analysis` et `final-analysis` ;
- exécuter les skills dans une boucle bornée ;
- définir le prompt de recherche et d’analyse ;
- produire `AnalystDossier` ;
- imposer la séparation faits / interprétations / hypothèses ;
- appliquer les limites par analyste.

### Lot 5 — Intégration orchestrateur

- intégrer l’agent dans la phase B ;
- transmettre les dossiers à la consolidation ;
- implémenter `AB → ABC` avec provenance ;
- adapter les révisions ;
- intégrer les citations à la synthèse finale.

### Lot 6 — Persistance et interface

- persister les sources et requêtes ;
- afficher les citations ;
- afficher les erreurs de recherche ;
- compléter la timeline ;
- distinguer mode démo et mode recherche réel ;
- masquer temporairement les pages Providers, Configurations et Profils du parcours principal, sans supprimer leur code ;
- conserver un accès technique aux credentials côté serveur ;
- prévoir une page d’état minimale si une clé requise est absente.

### Lot 7 — Validation expérimentale

- constituer un corpus de 30 à 50 questions ;
- exécuter les variantes sans recherche, avec recherche simple et avec recherche multi-agents ;
- mesurer exactitude, couverture, traçabilité, contradictions, coût et latence ;
- analyser les cas d’échec ;
- décider si l’approche est validée et quels réglages conserver.

## 14. Tests d’acceptation

Le MVP ne sera considéré comme prêt que si :

- chaque analyste peut effectuer une recherche indépendante ;
- les requêtes et sources sont séparées par analyste ;
- les citations sont conservées sans être inventées ;
- les consolidations AB et ABC conservent la provenance ;
- les erreurs de recherche n’arrêtent pas silencieusement le workflow ;
- les limites de coût, recherches et durée sont respectées ;
- le mode démo fonctionne sans clé Gemini ;
- la synthèse distingue les faits établis des incertitudes ;
- un test comparatif permet de mesurer le gain de la recherche ;
- aucun secret n’apparaît dans les logs ou réponses.
- les agents utilisés proviennent du manifeste Hermès et non d’une configuration utilisateur incomplète ;
- chaque agent possède une liste de skills explicite et contrôlée ;
- une modification du manifeste peut être appliquée et vérifiée par Open Code ;
- les pages de configuration non nécessaires ne bloquent pas l’exécution du MVP.

## 15. Livrables

- contrats TypeScript de recherche ;
- adapter Gemini Google Search ;
- runtime Hermès et manifeste des agents ;
- skills de recherche et de vérification ;
- consolidation structurée AB/ABC ;
- persistance des sources et preuves ;
- interface des citations et états de recherche ;
- tests unitaires et d’intégration ;
- corpus d’évaluation ;
- rapport de validation de l’hypothèse.

## 16. Décision attendue après le MVP

À la fin du MVP, trois décisions devront être prises sur la base des résultats :

1. la recherche multi-agents apporte-t-elle un gain mesurable ?
2. la consolidation AB/ABC apporte-t-elle un gain supplémentaire par rapport à une synthèse directe ?
3. faut-il ajouter d’autres modèles, skills et connecteurs OSINT ?
4. faut-il réintroduire une configuration utilisateur des agents, providers et profils ?

Le MVP doit donc être conçu comme une expérience mesurable, et non uniquement comme une fonctionnalité de navigation web.
