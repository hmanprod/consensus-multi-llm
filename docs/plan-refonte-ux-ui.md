# Plan complet de refonte UX / UI — Consensus

**Statut :** implémenté (lots 0 à 6)  
**Version :** 1.1  
**Date :** 17 août 2026  
**Périmètre :** application web Consensus — expérience conversationnelle, outputs, configuration et responsive

## 1. Résumé exécutif

Consensus possède déjà une base fonctionnelle solide : conversations, orchestration multi-modèles, profils, providers et détails d’exécution. L’interface actuelle expose cependant trop tôt la complexité technique et présente les résultats dans une seule colonne verticale.

La refonte doit faire évoluer l’application d’un **chat avec détails empilés** vers une **expérience conversationnelle avec espace de travail latéral** :

```text
Sidebar                         Conversation                 Workspace output
Conversations                   Question / réponse           Synthèse
Projets                         Progression                  Comparaison
Paramètres                      Actions                      Export
```

L’utilisateur doit comprendre rapidement :

1. ce que Consensus peut faire ;
2. où poser sa question ;
3. quelle est la conclusion ;
4. pourquoi cette conclusion est fiable ;
5. où consulter les analyses détaillées sans interrompre la conversation.

## 2. Objectifs

### Objectifs produit

- Faire de la conversation l’expérience principale.
- Rendre la synthèse immédiatement lisible et actionnable.
- Masquer la complexité technique jusqu’à ce qu’elle soit utile.
- Transformer les détails du workflow en outputs consultables.
- Donner à l’application une identité visuelle plus forte.
- Préparer l’ajout de documents, exports et Canvas-like workspace.

### Objectifs UX mesurables

- Un nouvel utilisateur doit pouvoir lancer une première analyse en moins de 30 secondes.
- La conclusion doit être identifiable en moins de 5 secondes après affichage.
- Les détails du workflow doivent être accessibles en un clic maximum.
- L’utilisateur doit pouvoir fermer le workspace sans perdre son contexte.
- L’interface doit être utilisable au clavier et sur mobile.
- Les états loading, succès, erreur et interruption doivent être compréhensibles sans lire les logs.

### Hors périmètre initial

- Modification du moteur d’orchestration.
- Changement de provider ou de modèle.
- Refonte de l’authentification Clerk.
- Ajout immédiat de la collaboration temps réel.
- Génération avancée de documents tant que le workspace de base n’est pas stabilisé.

## 3. Principes directeurs

### 3.1 Conversation d’abord

La conversation est la surface principale. Les providers, modèles, coûts et étapes sont secondaires.

### 3.2 Complexité progressive

Afficher d’abord la conclusion, puis les accords, désaccords et hypothèses, puis les analyses détaillées et métriques techniques.

### 3.3 Un output = un espace de travail

Une synthèse longue ou un comparatif ne doit pas allonger indéfiniment le fil. Il doit pouvoir s’ouvrir dans un panneau droit indépendant.

### 3.4 Transparence sans surcharge

Le produit doit expliquer comment le consensus a été construit, mais sous forme de résumé visuel et d’accordéons, pas de logs techniques exposés en permanence.

### 3.5 Actions contextuelles

Copier, exporter, approfondir, comparer et régénérer doivent être disponibles près du contenu concerné.

### 3.6 Accessibilité par défaut

Le contraste, le clavier, les labels, les annonces de statut et les tailles de zones tactiles sont des critères de conception, pas une passe finale.

## 4. Architecture UX cible

```text
AppShell
├── Sidebar
│   ├── Brand
│   ├── NewConversationButton
│   ├── ConversationSearch
│   ├── ConversationList
│   └── AccountAndSettings
│
├── MainWorkspace
│   ├── ConversationHeader
│   ├── ProviderBanner
│   ├── ConversationFeed
│   │   ├── UserMessage
│   │   ├── AssistantAnswer
│   │   ├── ConsensusSummaryCard
│   │   └── MessageActions
│   └── ComposerDock
│
└── OutputPanel
    ├── PanelHeader
    ├── OutputTabs
    ├── ConsensusView
    ├── AnalystComparisonView
    ├── WorkflowView
    ├── MetricsView
    └── ExportActions
```

## 5. Navigation et sidebar

### État actuel

La sidebar contient simultanément l’authentification, les conversations, le profil actif, une description du profil et les liens d’administration. Cela donne trop de poids aux réglages.

### Cible

La sidebar doit être centrée sur la navigation :

```text
Consensus

[+ Nouvelle conversation]
[Rechercher]

Aujourd’hui
  Analyse de marché
  Comparaison de stratégies

Cette semaine
  ...

────────────────────
Profil utilisateur
Paramètres
```

### Fonctionnalités

- Largeur desktop cible : 264 à 300 px.
- Sidebar rétractable sur desktop.
- Drawer plein écran ou quasi plein écran sur mobile.
- Conversations groupées par date.
- Titre tronqué avec tooltip ou menu contextuel.
- Renommer une conversation.
- Supprimer ou archiver une conversation avec confirmation.
- Rechercher dans les conversations.
- État actif très visible mais discret.
- Navigation clavier entre les conversations.

### Évolutions de composants

- Remplacer `Sidebar` monolithique par plusieurs composants :
  - `BrandMark`
  - `NewConversationButton`
  - `ConversationSearch`
  - `ConversationGroup`
  - `ConversationItem`
  - `AccountMenu`
- Ajouter un état `sidebarCollapsed` dans `AppShell`.
- Prévoir un `MobileSidebarDrawer`.

## 6. Écran d’accueil

### Cible de contenu

```text
Que voulez-vous examiner aujourd’hui ?

Plusieurs modèles analysent votre question indépendamment,
confrontent leurs points de vue et produisent une synthèse claire.

[Comparer deux stratégies]
[Challenger une hypothèse]
[Analyser une décision complexe]

┌─────────────────────────────────────────────┐
│ Posez votre question…                       │
│                                             │
│ + Économique · 2 analystes              ↑  │
└─────────────────────────────────────────────┘
```

### Recommandations

- Remplacer le bouton long “Analyser la question” par une action `Envoyer`.
- Ajouter 3 à 4 exemples cliquables.
- Pré-remplir la question lorsqu’un exemple est sélectionné.
- Donner une explication courte de la valeur du consensus.
- Garder un alignement visuel cohérent avec le composer utilisé après la première question.

## 7. Composer

### Fonctionnalités MVP

- Textarea auto-extensible.
- Enter pour envoyer.
- Shift + Enter pour insérer une nouvelle ligne.
- Bouton d’envoi iconographique avec label accessible.
- Bouton d’arrêt pendant l’analyse.
- Profil actif visible dans le composer.
- Menu d’outils extensible.
- Affichage du nombre d’analystes et du niveau de profondeur.
- Message d’aide clavier discret.
- État disabled explicite.

### Fonctionnalités futures préparées

- Upload de fichiers.
- Ajout de sources ou liens.
- Mode recherche.
- Ouverture dans un workspace document.
- Choix du budget.
- Niveau de profondeur : rapide, équilibré, approfondi.

### États à définir

| État | Comportement |
|---|---|
| Vide | Placeholder + exemples |
| Saisie | Envoi actif |
| Envoi | Composer verrouillé brièvement |
| Analyse | Bouton Arrêter + progression |
| Succès | Composer disponible |
| Erreur | Message local + réessayer |
| Conversation longue | Composer docké avec fondu supérieur |

## 8. Conversation et messages

### Message utilisateur

- Présentation compacte.
- Texte correctement wrappé.
- Menu `…` pour copier ou modifier si la fonctionnalité est ajoutée.
- Pas de label permanent “Vous” si l’avatar ou le style suffit.

### Réponse Consensus

La réponse doit être rendue en Markdown structuré, jamais comme un bloc `<pre>` unique.

Structure recommandée :

```text
Réponse finale

Conclusion
...

Résumé
• ...
• ...

Accords
• ...

Désaccords importants
• ...

[Ouvrir le consensus] [Copier] [Approfondir]
```

### Actions de réponse

- Copier.
- Régénérer.
- Approfondir.
- Poser une question de suivi.
- Ouvrir dans le workspace droit.
- Exporter.

## 9. Workspace output latéral

### Rôle

Le workspace est la surface dédiée aux outputs structurés. Il doit permettre de consulter un livrable sans perdre le fil de la conversation.

### Ouverture

Le panneau peut s’ouvrir depuis :

- la carte de synthèse ;
- le bouton “Voir les détails” ;
- le menu d’actions d’une réponse ;
- un résultat long détecté automatiquement ;
- une future pièce jointe ou un document généré.

### Dimensions et comportement

- Largeur par défaut : 440 px.
- Largeur configurable entre 360 et 640 px à terme.
- Overlay léger uniquement sur mobile.
- Animation courte et désactivable avec `prefers-reduced-motion`.
- Scroll interne indépendant.
- Header sticky avec titre, type d’output et fermeture.
- État conservé à la fermeture et à la réouverture.

### Onglets proposés

1. `Synthèse`
2. `Comparaison`
3. `Workflow`
4. `Métriques`

### Synthèse

- Conclusion.
- Niveau de confiance.
- Points d’accord.
- Points de désaccord.
- Hypothèses sensibles.
- Recommandation finale.

### Comparaison

Tableau ou cartes par analyste :

| Analyste | Position | Confiance | Différence principale |
|---|---|---|---|
| B | ... | ... | ... |
| C | ... | ... | ... |

### Workflow

Présenter A0 → A1 → B1 → B2 → B3 → C sous forme de timeline compacte avec :

- statut ;
- durée ;
- modèle utilisé ;
- aperçu de sortie ;
- ouverture du détail.

### Métriques

- Coût estimé.
- Coût réel.
- Tokens.
- Durée totale.
- Nombre de modèles.
- Éventuels rounds ciblés.

## 10. Modèle de données UI

Ajouter ou formaliser un état de workspace côté interface :

```ts
type OutputPanelTab = "summary" | "comparison" | "workflow" | "metrics";

type OutputPanelState = {
  open: boolean;
  runId: string | null;
  activeTab: OutputPanelTab;
};
```

Prévoir des composants découplés du stockage :

- `OutputPanel`
- `OutputPanelHeader`
- `OutputPanelTabs`
- `ConsensusSummary`
- `AnalystComparison`
- `WorkflowTimeline`
- `RunMetrics`
- `OutputExportMenu`

## 11. Progression et états d’exécution

Remplacer le message générique par une progression lisible :

```text
Analyse en cours

✓ Compréhension de la question
✓ Analyses indépendantes
● Comparaison des points de vue
○ Recherche des désaccords
○ Synthèse finale

[Arrêter]
```

### Règles

- Les étapes terminées restent consultables.
- Les erreurs sont rattachées à l’étape concernée.
- Un timeout doit proposer une action claire.
- Les changements sont annoncés aux lecteurs d’écran avec `aria-live`.
- Le texte ne doit pas exposer de détails internes incompréhensibles.

## 12. Bannière providers et mode démo

La bannière actuelle est utile mais trop dominante visuellement.

### Cible

- Bannière moins haute.
- Icône de statut.
- Message simplifié : `Mode démo actif`.
- Lien secondaire `Configurer les providers`.
- Dismiss persistant pendant la session.
- Explication détaillée dans un tooltip ou panneau.

Exemple :

```text
Mode démo actif · Les analyses sont simulées
Configurer les providers
```

## 13. Pages de configuration

### Providers

Transformer les lignes actuelles en cartes :

- identité du provider ;
- statut ;
- modèle utilisé ;
- clé masquée ;
- date du dernier test ;
- champ de remplacement ;
- bouton tester ;
- message de résultat au niveau de la carte.

Les erreurs doivent être proches du champ et ne jamais révéler la clé.

### Configurations

Présenter une configuration comme une fiche :

```text
Configuration équilibrée
2 analystes · coût estimé faible · vitesse moyenne

Orchestrateur
Analyste B
Analyste C

[Utiliser] [Modifier]
```

Le formulaire avancé peut rester détaillé, mais doit être regroupé par rôles et sections repliables.

### Paramètres

Conserver une page d’état technique, mais utiliser :

- groupes de paramètres ;
- badges de statut ;
- liens d’action ;
- explications lisibles ;
- possibilité de copier les informations non sensibles.

## 14. Design system minimal

### Tokens

Définir les tokens dans `globals.css` :

- couleurs sémantiques ;
- niveaux de texte ;
- espacements ;
- rayons ;
- ombres ;
- hauteurs de contrôles ;
- largeur du workspace.

### Composants à standardiser

- `Button` : primaire, secondaire, ghost, danger.
- `IconButton` : toujours avec tooltip et label accessible.
- `Badge` : statut, accord, désaccord, mode.
- `Card` : contenu, sélectionnée, information, erreur.
- `Panel` : section, accordéon, drawer.
- `Toast` : succès, erreur, information.
- `Skeleton` : réponse, liste, panneau.
- `MarkdownRenderer`.
- `Tooltip`.

### Règles visuelles

- Une seule action primaire par zone.
- Les boutons destructifs utilisent une couleur sémantique.
- Les capitales sont réservées aux labels très courts.
- Les bordures ne doivent pas être le seul moyen de séparer les zones.
- Les icônes doivent être cohérentes et ne pas être remplacées par des caractères Unicode ambigus.

## 15. Responsive

### Desktop

- Sidebar visible et rétractable.
- Conversation centrée.
- Workspace droit indépendant.
- Composer docké en bas.

### Tablette

- Sidebar plus étroite.
- Workspace réduit ou ouvert en drawer.
- Composer pleine largeur utile.

### Mobile

- Sidebar en drawer.
- Header avec bouton menu.
- Workspace en plein écran.
- Actions de message regroupées dans un menu.
- Touch targets minimum 44 × 44 px.
- Pas de tableau large sans version en cartes.

## 16. Accessibilité

- Contraste WCAG AA minimum.
- Focus visible sur tous les contrôles.
- Labels explicites pour les textareas et selects.
- `aria-expanded` sur les accordéons.
- `aria-label` sur les boutons icône.
- `aria-live="polite"` pour la progression.
- Annonce des erreurs et succès.
- Support de la navigation clavier dans sidebar, tabs et panneau.
- Respect de `prefers-reduced-motion`.
- Ne pas coder les statuts par couleur seule.
- Vérifier l’ordre de tabulation avec panneau ouvert et fermé.

## 17. Plan de mise en œuvre

### Lot 0 — Préparation

- Corriger l’environnement de test Clerk afin que l’application soit inspectable sans erreur runtime.
- Capturer des références visuelles desktop, tablette et mobile.
- Ajouter une checklist UX dans le projet.
- Définir les tokens et composants de base.

### Lot 1 — Shell et navigation

- Refactoriser `AppShell`.
- Simplifier `Sidebar`.
- Ajouter sidebar rétractable.
- Ajouter drawer mobile.
- Repenser les groupes de conversations.

### Lot 2 — Composer et accueil

- Créer le nouveau composer.
- Ajouter auto-resize et raccourcis clavier.
- Ajouter profils dans le composer.
- Ajouter exemples de questions.
- Ajouter bouton d’arrêt.

### Lot 3 — Réponses structurées

- Remplacer les `<pre>` par un renderer Markdown.
- Créer `ConsensusSummaryCard`.
- Ajouter actions Copier, Régénérer, Approfondir.
- Ajouter états loading, erreur et succès.

### Lot 4 — Workspace output

- Créer `OutputPanel`.
- Migrer `RunDetails` dans le panneau.
- Ajouter onglets Synthèse, Comparaison, Workflow, Métriques.
- Ajouter fermeture, état actif et responsive.

### Lot 5 — Configuration

- Refonte Providers.
- Refonte Configurations.
- Refonte Paramètres.
- Clarifier le mode démo.

### Lot 6 — Qualité produit

- Tests responsive.
- Tests clavier.
- Tests lecteurs d’écran de base.
- Tests d’erreurs et interruptions.
- Tests de non-régression des conversations.
- Mesure des parcours principaux.

## 18. Critères d’acceptation

### Accueil

- L’écran vide contient une proposition de valeur claire.
- Au moins trois exemples sont disponibles.
- Un exemple remplit correctement le composer.
- Le bouton d’envoi est accessible au clavier.

### Conversation

- Une réponse est lisible sans ouvrir les détails.
- La conclusion est distinguée des analyses.
- Les actions principales sont accessibles au niveau de la réponse.
- Le composer reste utilisable après une réponse.

### Workspace

- Le panneau s’ouvre sans navigation de page.
- La fermeture conserve l’état et le scroll.
- Les quatre vues sont accessibles.
- Le panneau est indépendant du scroll principal sur desktop.
- Il devient utilisable en plein écran sur mobile.

### Exécution

- La progression indique clairement l’état courant.
- L’utilisateur peut arrêter une analyse si le backend le permet.
- Une erreur indique la prochaine action possible.
- Les métriques sont séparées du contenu principal.

### Accessibilité

- Tous les contrôles sont atteignables au clavier.
- Les boutons icône ont un nom accessible.
- Les états dynamiques sont annoncés.
- Le contraste est vérifié.

## 19. Tests et validation

### Tests manuels

1. Ouvrir une nouvelle conversation.
2. Utiliser un exemple de question.
3. Envoyer une question courte.
4. Observer chaque état de progression.
5. Lire la synthèse finale.
6. Ouvrir le workspace.
7. Passer entre les quatre onglets.
8. Fermer et rouvrir le workspace.
9. Créer une seconde conversation.
10. Tester l’affichage mobile.

### Tests automatisés

- Rendu de l’accueil.
- Envoi d’une question.
- Affichage du loading state.
- Ouverture et fermeture du panneau.
- Navigation entre onglets.
- Affichage d’une erreur.
- Sidebar mobile.
- Raccourcis clavier du composer.

### Vérification visuelle

Captures attendues pour :

- accueil desktop ;
- conversation avec réponse ;
- workspace ouvert ;
- workflow détaillé ;
- providers ;
- configurations ;
- mobile fermé ;
- mobile workspace ouvert.

## 20. Indicateurs de réussite

- Taux de première analyse complétée.
- Temps avant première question envoyée.
- Temps avant ouverture d’un output.
- Utilisation du workspace.
- Taux de consultation des accords et désaccords.
- Taux d’erreur du composer.
- Abandon pendant une analyse.
- Nombre de conversations réutilisées.

## 21. Décisions à prendre avant développement

- Le workspace s’ouvre-t-il automatiquement pour toutes les réponses longues ou uniquement sur action ?
- Les documents générés doivent-ils être persistés comme objets séparés des conversations ?
- Faut-il introduire la notion de projet dès la première version ?
- L’export PDF est-il MVP ou post-MVP ?
- Le panneau doit-il être redimensionnable dès le départ ?
- Quels niveaux de confiance peuvent être affichés sans donner une fausse précision ?

## 22. Recommandation finale

La première version de la refonte doit se concentrer sur trois livrables visibles :

1. un composer moderne et central ;
2. une réponse finale structurée ;
3. un workspace output latéral pour les détails et documents.

Ces trois changements feront évoluer immédiatement la perception du produit, sans nécessiter de modifier le moteur Consensus. Ils permettront également d’ajouter plus tard les documents, Canvas, exports et projets sans repartir sur une nouvelle architecture d’interface.
