# Audit UX et plan d’amélioration — Workflow dans le fil de discussion

**Projet :** Consensus Multi-Agent LLM  
**Date :** 19 août 2026  
**Périmètre :** fil de discussion, progression du workflow, affichage des analyses intermédiaires, synthèse finale et side panel

## 1. Objet du document

Ce document formalise l’audit UX de la dernière version de l’interface et définit un nouveau plan d’amélioration.

L’objectif est de faire du fil de discussion l’espace principal où l’utilisateur comprend la construction de la réponse : plusieurs analyses indépendantes sont produites, confrontées progressivement, puis transformées en synthèse finale.

Le screenshot fourni sert de référence visuelle pour l’intention UX. Il ne constitue pas une spécification technique à reproduire littéralement.

## 2. Conclusion de l’audit

La dernière version a corrigé un problème important : la synthèse complète est maintenant visible directement dans le fil de discussion.

Cependant, le workflow reste présenté comme une liste technique placée sous la synthèse. L’utilisateur voit donc la conclusion avant de voir les raisonnements qui l’ont construite.

Le workflow attendu doit être :

```text
Question utilisateur
        ↓
Analyse A
Analyse B
Analyse C
        ↓
Analyse AB
        ↓
Analyse ABC
        ↓
Synthèse finale
```

Chaque étape A, B, C, AB et ABC doit être visible dans le fil. Lorsque l’utilisateur clique sur une étape, celle-ci doit se déployer ou ouvrir une vue dédiée afin de lire son analyse complète.

## 3. Écarts constatés

### 3.1 Le workflow actuel ne représente pas suffisamment les sorties

L’interface actuelle présente principalement les étapes suivantes :

```text
A — Compréhension de la question
B — Analyses indépendantes
S — Mise en commun
R — Révisions
F — Synthèse finale
```

Cette représentation est adaptée à une timeline technique, mais pas à une expérience de lecture. Elle masque les sorties individuelles des analystes et ne permet pas de distinguer les différentes consolidations.

### 3.2 Les analyses indépendantes sont regroupées

L’étape B affiche un compteur d’analystes, mais l’utilisateur ne peut pas lire clairement :

- l’analyse A ;
- l’analyse B ;
- l’analyse C ;
- les différences entre leurs raisonnements ;
- le modèle ou le rôle associé à chaque sortie.

La valeur du système multi-agent repose pourtant sur cette diversité de points de vue.

### 3.3 La consolidation est trop abstraite

Une étiquette telle que « Mise en commun » indique une opération, mais pas le résultat de cette opération.

L’utilisateur doit pouvoir lire :

- l’analyse AB produite à partir de A et B ;
- l’analyse ABC produite à partir de A, B et C.

Ces consolidations sont des étapes de raisonnement à part entière et doivent être traitées comme des messages du fil.

### 3.4 La synthèse arrive avant le raisonnement

La grande carte de synthèse est actuellement la première information importante affichée après la question. Le workflow est présenté ensuite dans un accordéon.

Cela donne une logique de rapport :

```text
Conclusion → détails techniques
```

L’expérience cible doit plutôt suivre une logique de construction :

```text
Analyses → confrontations → consolidation → synthèse
```

### 3.5 Les analyses sont trop structurées

Les sections suivantes sont pertinentes pour une synthèse finale :

- Résumé ;
- Points d’accord ;
- Points de désaccord ;
- Limites ;
- Prochaine étape.

Elles ne doivent pas imposer la forme des analyses A, B et C.

Chaque analyste doit pouvoir produire une réponse libre, avec son propre raisonnement, sa propre structure et ses propres priorités.

La structure éditoriale standard doit être réservée à la synthèse finale, lorsque cela apporte réellement de la clarté.

## 4. Vision UX cible

Le fil doit être compris comme une conversation enrichie par des étapes de raisonnement.

```text
┌─────────────────────────────────────┐
│ Question utilisateur                 │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Analyse A                         ˅  │
│ Aperçu de l’analyse...              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Analyse B                         ˅  │
│ Aperçu de l’analyse...              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Analyse C                         ˅  │
│ Aperçu de l’analyse...              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Analyse AB                        ˅  │
│ Première confrontation...           │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Analyse ABC                       ˅  │
│ Consolidation des trois points...   │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Synthèse finale                      │
│ Recommandation et réponse complète  │
└─────────────────────────────────────┘
```

## 5. Interaction au clic

### 5.1 Comportement desktop

Un clic sur A, B, C, AB ou ABC doit développer l’analyse dans le fil, sans changer de page.

Comportement recommandé :

1. l’étape affiche un aperçu de deux à quatre lignes lorsqu’elle est repliée ;
2. un clic sur la carte ou son bouton d’ouverture la développe ;
3. le contenu Markdown complet devient lisible dans la même carte ;
4. l’utilisateur peut refermer l’analyse sans perdre sa position dans le fil ;
5. un second clic sur une autre étape peut ouvrir celle-ci sans fermer obligatoirement les autres.

Le comportement par défaut recommandé est :

- A, B, C repliées après génération, car elles peuvent être longues ;
- AB et ABC repliées ou semi-ouvertes selon leur longueur ;
- la synthèse finale ouverte par défaut.

### 5.2 Comportement mobile

Sur mobile, deux options sont acceptables :

- déploiement inline dans le fil ;
- ouverture d’un panneau plein écran avec un bouton retour vers le fil.

Le contenu doit rester contextuel : le titre de l’analyse, son étape et son origine doivent rester visibles.

### 5.3 Accessibilité

Chaque étape doit être un bouton ou un élément contrôlable avec :

- `aria-expanded` ;
- `aria-controls` ;
- un titre explicite, par exemple `Ouvrir l’analyse B` ;
- un état visuel qui ne dépend pas uniquement de la couleur ;
- un focus clavier visible.

## 6. Modèle de workflow fonctionnel

### Analyse A

Première analyse indépendante. Elle répond directement à la question sans connaître les autres analyses.

### Analyse B

Deuxième analyse indépendante. Elle répond à la même question sans être influencée par A.

### Analyse C

Troisième analyse indépendante. Elle apporte un autre point de vue ou une autre méthode d’évaluation.

### Analyse AB

Première confrontation. Elle reçoit les analyses A et B et identifie les convergences, divergences, hypothèses et points à approfondir.

### Analyse ABC

Consolidation complète. Elle reçoit les analyses A, B, C et AB afin de construire une compréhension commune avant la synthèse finale.

### Synthèse finale

Réponse destinée à l’utilisateur. Elle transforme les travaux précédents en une réponse claire, argumentée et actionnable.

## 7. Principe de liberté des analyses

Les analyses A, B et C doivent être libres.

Le prompt ne doit pas les forcer à produire systématiquement les mêmes rubriques. Elles peuvent contenir :

- une argumentation ;
- une comparaison ;
- des hypothèses ;
- une objection ;
- un calcul ;
- une recommandation provisoire ;
- une analyse des risques ;
- une demande de clarification si la question est ambiguë.

Les analyses AB et ABC doivent également rester libres, mais leur contexte doit être explicite : elles sont produites à partir d’autres analyses.

La synthèse finale peut utiliser une structure standardisée lorsque celle-ci aide à la décision :

```text
Recommandation
Résumé
Points d’accord
Points de désaccord
Limites
Prochaine étape
```

Cette structure ne doit pas être imposée si la question appelle une autre forme de réponse.

## 8. Plan d’amélioration

### Phase 1 — Valider le contrat produit

Objectif : figer la nouvelle séquence avant modification de l’interface.

À définir :

- nombre d’analystes supportés au MVP : A, B, C ;
- relations exactes entre A, B, C, AB et ABC ;
- caractère obligatoire ou optionnel de chaque étape ;
- comportement en cas d’échec d’un analyste ;
- comportement en cas d’arrêt budgétaire ;
- règle d’affichage lorsque le nombre d’analystes est inférieur à trois.

Critère de validation : l’équipe peut décrire le workflow sans utiliser les anciennes étapes S et R.

### Phase 2 — Revoir les contrats de données

Créer une sortie identifiable pour chaque étape.

Exemple conceptuel :

```ts
type WorkflowStep = "A" | "B" | "C" | "AB" | "ABC" | "F";

type WorkflowOutput = {
  id: string;
  step: WorkflowStep;
  label: string;
  kind: "independent-analysis" | "combined-analysis" | "final-synthesis";
  text: string;
  model?: ModelSpec;
  inputSteps?: WorkflowStep[];
  status: "pending" | "running" | "done" | "error";
  durationMs?: number;
  error?: string;
};
```

Le moteur doit conserver les textes complets de chaque sortie. Une timeline ne suffit pas si elle ne contient que le statut et la durée.

### Phase 3 — Adapter l’orchestrateur

L’orchestrateur doit exécuter la séquence suivante :

```text
A, B et C en parallèle
        ↓
AB
        ↓
ABC
        ↓
F — synthèse finale
```

Les analyses A, B et C ne doivent pas recevoir les réponses des autres analystes.

AB reçoit uniquement A et B, sauf décision contraire explicitement documentée.

ABC reçoit A, B, C et AB.

F reçoit le contexte consolidé nécessaire à la réponse finale.

### Phase 4 — Créer les composants de conversation

Introduire une architecture de composants proche de :

```text
ConversationFeed
├── UserMessage
├── WorkflowProgress
├── WorkflowMessage
│   ├── WorkflowStepHeader
│   ├── WorkflowStepPreview
│   ├── WorkflowStepContent
│   └── WorkflowStepActions
└── FinalSynthesisMessage
```

`WorkflowMessage` doit gérer l’ouverture et la fermeture d’une analyse.

### Phase 5 — Afficher le workflow en temps réel

La progression doit refléter les événements réels du moteur et non un délai visuel artificiel.

Exemple :

```text
Analyse indépendante
✓ Analyse A terminée
✓ Analyse B terminée
● Analyse C en cours

Consolidation
○ Analyse AB en attente
○ Analyse ABC en attente

Synthèse
○ Synthèse finale en attente
```

Pour A, B et C, afficher également un compteur : `2/3 terminées`.

### Phase 6 — Repositionner la synthèse finale

La synthèse finale doit être le dernier message du workflow et rester ouverte par défaut.

Elle doit présenter la réponse complète, mais rester indépendante des analyses intermédiaires.

Les actions principales sont :

- Copier ;
- Télécharger ;
- Relancer ;
- Approfondir ;
- Poser une question de suivi ;
- Ouvrir les détails.

### Phase 7 — Simplifier le side panel

Supprimer l’onglet `Workflow` du side panel.

Conserver :

```text
Comparaison
Sources
Métriques
```

La comparaison peut afficher A, B et C côte à côte ou sous forme de cartes. Les contenus AB et ABC peuvent y être référencés, mais leur lecture principale doit rester dans le fil.

### Phase 8 — Vérifier le responsive et l’accessibilité

Vérifier :

- ouverture inline sur desktop ;
- lecture confortable sur mobile ;
- zones tactiles d’au moins 44 × 44 px ;
- navigation clavier entre les étapes ;
- annonces `aria-live` pendant l’exécution ;
- distinction entre attente, exécution, succès et erreur ;
- respect de `prefers-reduced-motion` ;
- conservation de la position de lecture après ouverture ou fermeture.

## 9. États UX à couvrir

### Analyse en cours

Les étapes apparaissent progressivement et indiquent clairement celle qui est active.

### Analyse terminée

La carte affiche un aperçu et peut être ouverte pour lire le contenu complet.

### Erreur sur un analyste

L’étape concernée affiche l’erreur et une action possible : réessayer, continuer avec les autres analyses ou arrêter.

### Arrêt utilisateur

Le fil conserve les analyses déjà terminées et indique que la suite n’a pas été exécutée.

### Budget dépassé

Le fil indique précisément la dernière étape terminée et explique que la synthèse peut être absente ou partielle.

### Synthèse finale indisponible

L’utilisateur peut consulter A, B, C, AB ou ABC et relancer la synthèse si le contexte est suffisant.

## 10. Critères d’acceptation

### Workflow

- [ ] A, B et C sont des analyses indépendantes distinctes.
- [ ] AB est une sortie identifiable et lisible.
- [ ] ABC est une sortie identifiable et lisible.
- [ ] F est générée seulement après ABC.
- [ ] L’ordre affiché est A/B/C puis AB puis ABC puis F.
- [ ] Chaque étape affiche son statut réel.

### Lecture

- [ ] Cliquer sur A ouvre ou déploie l’analyse A.
- [ ] Cliquer sur B ouvre ou déploie l’analyse B.
- [ ] Cliquer sur C ouvre ou déploie l’analyse C.
- [ ] Cliquer sur AB ouvre ou déploie l’analyse AB.
- [ ] Cliquer sur ABC ouvre ou déploie l’analyse ABC.
- [ ] Le contenu complet est rendu en Markdown lisible.
- [ ] Les analyses intermédiaires ne sont pas forcées dans les rubriques de la synthèse.
- [ ] La synthèse finale est visible directement dans le fil.

### Navigation

- [ ] Le side panel ne contient plus d’onglet Workflow.
- [ ] Le side panel est réservé à la comparaison, aux sources et aux métriques.
- [ ] Ouvrir ou fermer une analyse ne change pas de page.
- [ ] La position de lecture est conservée.

### Qualité produit

- [ ] Les textes des analyses intermédiaires sont conservés dans le stockage.
- [ ] Aucun secret ou contenu sensible n’apparaît dans les détails techniques.
- [ ] Les erreurs sont compréhensibles et proposent une action.
- [ ] Le workflow fonctionne en mode démo et avec les providers réels.

## 11. Priorisation

### P0 — Indispensable

- Remplacer le workflow A → B → S → R → F par A/B/C → AB → ABC → F.
- Conserver le texte complet de chaque sortie.
- Afficher chaque sortie comme une carte ouvrable dans le fil.
- Afficher la synthèse finale en dernier.
- Retirer le workflow du side panel.

### P1 — Important

- Progression temps réel.
- Analyses libres non contraintes par les rubriques de synthèse.
- Compteur A/B/C terminées.
- États d’erreur et d’arrêt par étape.
- Comparaison améliorée dans le side panel.

### P2 — Évolution

- Ouvrir une analyse dans une vue plein écran sur mobile.
- Ajouter des liens entre une conclusion de ABC et les analyses sources.
- Permettre de demander une révision d’une analyse précise.
- Ajouter une vue de provenance des arguments.

## 12. Résultat attendu

L’expérience finale doit raconter clairement l’histoire suivante :

```text
L’utilisateur pose une question.

Consensus produit trois points de vue indépendants : A, B et C.

Consensus confronte ensuite ces points de vue avec AB.

Consensus consolide l’ensemble avec ABC.

Consensus produit enfin une synthèse finale.

L’utilisateur peut lire chaque analyse en cliquant dessus.

Le side panel sert uniquement à comparer, vérifier les sources
et consulter les métriques.
```

La synthèse répond à la question. Les analyses intermédiaires rendent la réponse transparente. Le side panel permet l’audit détaillé sans interrompre la conversation.
