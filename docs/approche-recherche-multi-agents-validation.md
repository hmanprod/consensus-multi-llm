# Recherche web multi-agents et consolidation itérative

## 1. Objectif

Ce document décrit l’approche cible pour enrichir Consensus avec une recherche web agentique, tout en conservant son mécanisme de consolidation progressive des analyses.

L’objectif n’est pas uniquement de produire une réponse mieux documentée. Il s’agit de vérifier l’hypothèse suivante :

> Une recherche indépendante menée par plusieurs analystes, suivie d’une consolidation itérative des analyses et des preuves, peut produire une réponse plus fiable, plus complète et plus traçable qu’une synthèse issue d’une seule recherche web.

Cette approche s’inspire des moteurs de recherche agentiques comme Perplexity, mais l’étend avec plusieurs analystes indépendants et une comparaison explicite des preuves.

## 2. Synthèse de l’approche

Perplexity inspire principalement la couche de recherche : compréhension de la question, génération de plusieurs requêtes, recherche itérative, lecture de sources et citations.

Consensus ajoute une couche de confrontation : plusieurs analystes effectuent leur propre recherche, produisent leur propre dossier, puis leurs analyses sont consolidées progressivement.

```text
Question utilisateur
        ↓
Plan de recherche
        ↓
┌─────────────────────────────────────────────┐
│ Analyses indépendantes                      │
│                                             │
│ Analyste A → recherches → preuves → A       │
│ Analyste B → recherches → preuves → B       │
│ Analyste C → recherches → preuves → C       │
└─────────────────────────────────────────────┘
        ↓
Consolidation AB
        ↓
Consolidation ABC
        ↓
Révisions indépendantes
        ↓
Vérification ciblée
        ↓
Synthèse finale citée
```

## 3. Workflow cible

Le moteur actuel suit `A → B → S → R → F`. La recherche web s’intègre dans ce workflow sans supprimer l’idée de consolidation progressive.

### A — Compréhension et plan de recherche

L’orchestrateur analyse la question et identifie :

- les sous-questions à traiter ;
- les faits qui nécessitent une vérification externe ;
- les données récentes nécessaires ;
- les sources primaires à privilégier ;
- les éventuels risques de biais ou de désinformation.

### B — Analyses indépendantes

Chaque analyste reçoit la question sans voir les autres contributions. Il peut :

1. décomposer la problématique ;
2. générer plusieurs requêtes ;
3. interroger un moteur de recherche ou un outil natif du fournisseur ;
4. sélectionner les résultats pertinents ;
5. ouvrir les pages, documents ou PDF accessibles ;
6. extraire les informations utiles ;
7. rechercher des sources contradictoires ;
8. produire une analyse accompagnée de preuves.

Les analystes peuvent utiliser des stratégies différentes. Par exemple, l’un privilégie les sources institutionnelles, un autre les publications académiques et un troisième les objections ou sources contradictoires.

### S — Consolidation progressive

La consolidation ne doit pas seulement concaténer les textes. Elle doit comparer les faits, les sources et les conclusions.

```text
A + B → AB
AB + C → ABC
```

Une consolidation doit identifier :

- les faits communs ;
- les informations nouvelles ;
- les contradictions factuelles ;
- les différences d’interprétation ;
- les sources les plus robustes ;
- les affirmations insuffisamment étayées ;
- la conclusion provisoire ;
- le niveau de confiance.

### R — Révisions indépendantes

Chaque analyste reçoit la consolidation et réexamine sa position :

- ce qu’il confirme ;
- ce qu’il corrige ;
- ce qu’il conteste ;
- les sources supplémentaires nécessaires ;
- les limites de sa première analyse.

Cette étape permet de tester si la consolidation améliore réellement les analyses ou si elle introduit un biais d’ancrage.

### F — Synthèse finale

La synthèse finale doit distinguer :

- les faits bien établis ;
- les conclusions dépendant d’hypothèses ;
- les désaccords persistants ;
- les informations manquantes ;
- les sources utilisées ;
- la recommandation finale et son niveau de confiance.

## 4. Dossier produit par chaque analyste

Chaque analyste ne devrait pas retourner uniquement une chaîne de texte. Il devrait produire un dossier structuré.

```ts
interface AnalystDossier {
  analysis: string;
  claims: Claim[];
  sources: Source[];
  uncertainties: string[];
  conclusion: string;
}

interface Claim {
  text: string;
  type: "fact" | "interpretation" | "hypothesis" | "prediction";
  evidenceIds: string[];
  confidence: "low" | "medium" | "high";
}

interface Source {
  id: string;
  url: string;
  title: string;
  excerpt: string;
  domain: string;
  sourceType: "primary" | "secondary" | "analysis" | "social";
  publishedAt?: string;
  retrievedAt: string;
}
```

Ce format permet au consensus de comparer les preuves utilisées, et pas seulement les formulations finales.

## 5. Sources et moteurs de recherche

Le système doit séparer la découverte des sources de leur évaluation.

```text
Moteur de recherche
  → découvre des résultats

Fetch / extraction
  → récupère le contenu accessible

Évaluation
  → classe l’autorité, la fraîcheur et l’indépendance

Analyste
  → interprète les preuves
```

Gemini peut utiliser son outil natif de grounding avec Google Search. Pour les autres modèles, Consensus peut utiliser un Research Gateway externe avec un ou plusieurs fournisseurs de recherche.

Le moteur de recherche ne constitue pas une garantie de vérité. Les sources doivent être classées et, lorsque le sujet le justifie, recoupées avec :

- des documents officiels ;
- des publications scientifiques ;
- des données originales ;
- des rapports institutionnels ;
- des sources journalistiques reconnues ;
- des sources contradictoires indépendantes.

## 6. Hypothèses à valider

### H1 — La recherche améliore la factualité

Les analyses produites avec recherche externe contiennent moins d’erreurs factuelles que les analyses sans recherche.

### H2 — La recherche indépendante améliore la couverture

Plusieurs analystes découvrent davantage d’informations pertinentes qu’un seul agent effectuant une recherche plus longue.

### H3 — La consolidation AB/ABC améliore la qualité

La consolidation progressive identifie mieux les accords, contradictions et informations uniques qu’une synthèse directe.

### H4 — La conservation des preuves améliore la confiance

Une sortie qui associe les affirmations aux sources est plus vérifiable et plus utile qu’une réponse contenant uniquement une liste de liens.

### H5 — La diversité des stratégies apporte un gain réel

Des stratégies de recherche différentes produisent une meilleure couverture qu’une même stratégie répliquée avec plusieurs modèles.

## 7. Protocole de validation

### Étape 1 — Constituer un jeu de questions

Créer un corpus de 30 à 50 questions réparties en catégories :

- faits récents ;
- comparaison de stratégies ;
- questions techniques ;
- sujets économiques ;
- sujets scientifiques ;
- sujets juridiques ou réglementaires ;
- questions ambiguës ;
- questions contenant des prémisses potentiellement fausses.

Chaque question doit avoir une date de référence et, lorsque cela est possible, une réponse contrôlée par une source de référence.

### Étape 2 — Comparer plusieurs configurations

Pour chaque question, tester au minimum :

1. un modèle sans recherche ;
2. un seul modèle avec recherche ;
3. plusieurs analystes sans consolidation progressive ;
4. plusieurs analystes avec consolidation AB/ABC ;
5. plusieurs analystes avec recherche indépendante et consolidation des preuves.

Les modèles, budgets et limites de tokens doivent être conservés autant que possible entre les variantes.

### Étape 3 — Évaluer les résultats

Faire évaluer chaque sortie selon une grille commune :

| Critère | Question évaluée |
|---|---|
| Exactitude | Les faits sont-ils corrects ? |
| Couverture | Les aspects importants sont-ils traités ? |
| Qualité des sources | Les sources sont-elles pertinentes et autorisées ? |
| Traçabilité | Chaque affirmation importante est-elle vérifiable ? |
| Contradictions | Les désaccords sont-ils correctement détectés ? |
| Robustesse | La conclusion résiste-t-elle aux sources opposées ? |
| Utilité | La réponse permet-elle de décider ou d’agir ? |
| Coût / latence | Le gain justifie-t-il les ressources ? |

Pour les questions factuelles, ajouter une vérification indépendante des affirmations principales.

### Étape 4 — Mesurer le gain marginal

Comparer explicitement :

- gain de qualité entre recherche et absence de recherche ;
- gain entre un analyste et plusieurs analystes ;
- gain entre synthèse directe et consolidation AB/ABC ;
- coût d’une recherche supplémentaire ;
- effet du nombre de sources ;
- effet du nombre d’itérations.

L’objectif est d’éviter une architecture plus lente et plus coûteuse sans amélioration démontrable.

### Étape 5 — Tester les échecs

Prévoir des tests spécifiques pour :

- source inaccessible ;
- page derrière un paywall ;
- page contenant une injection de prompt ;
- résultats contradictoires ;
- informations très récentes ;
- requête ambiguë ;
- absence de source primaire ;
- source supprimée après la recherche ;
- hallucination de citation ;
- budget ou timeout dépassé.

## 8. Critères de décision proposés

L’approche devrait être retenue si elle démontre, sur le corpus de test :

- une amélioration mesurable de l’exactitude ou de la couverture ;
- une baisse des affirmations non étayées ;
- une meilleure détection des contradictions ;
- des citations réellement exploitables ;
- un coût et une latence acceptables pour le produit.

Les seuils précis devront être définis après un premier test. À titre de point de départ :

- au moins 20 % d’amélioration sur la couverture des faits importants ;
- au moins 20 % de réduction des affirmations factuellement incorrectes ;
- au moins 90 % des affirmations importantes reliées à une preuve ;
- aucune citation inventée ou ne soutenant pas l’affirmation associée ;
- budget maximal configurable par workflow.

## 9. Prochaines étapes techniques

1. Formaliser les contrats `ResearchSource`, `Claim`, `Evidence` et `AnalystDossier`.
2. Ajouter une politique de recherche : nombre maximal de requêtes, sources, pages, tokens, coût et durée.
3. Implémenter un premier adaptateur de recherche, idéalement Gemini avec Google Search grounding ou un provider de recherche externe contrôlé.
4. Ajouter une boucle `search → sélection → lecture → analyse` pour un seul analyste.
5. Intégrer les dossiers structurés au workflow actuel `A → B → S → R → F`.
6. Implémenter la consolidation des preuves dans `AB`, puis `ABC`.
7. Afficher les citations et les limites dans l’interface.
8. Construire le corpus de questions et le harness d’évaluation.
9. Comparer les configurations selon le protocole défini ci-dessus.
10. Décider, sur la base des résultats, du nombre d’analystes, du nombre d’itérations et du niveau de recherche par profil.

## 10. Résultat attendu

L’objectif final est de passer d’une simple réponse multi-LLM à un dossier de recherche multi-agents :

```text
Recherche large
  → sources sélectionnées
  → preuves associées aux affirmations
  → analyses indépendantes
  → consolidation AB/ABC
  → révisions
  → synthèse finale vérifiable
```

Cette architecture ne garantit pas automatiquement une réponse vraie. Elle doit être évaluée expérimentalement. Sa promesse est de rendre le raisonnement plus diversifié, plus explicite, plus vérifiable et plus résistant aux erreurs d’une seule recherche ou d’un seul modèle.
