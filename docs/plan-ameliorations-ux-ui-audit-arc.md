# Plan d’améliorations UX / UI — Audit Arc

**Statut :** prêt à exécuter  
**Version :** 1.0  
**Date :** 18 août 2026  
**Base d’audit :** application déployée inspectée dans Arc, desktop et viewport mobile 390 × 844

## 1. Résumé

La refonte actuelle a déjà introduit une bonne direction : sidebar moderne, composer, carte de synthèse et panneau de consensus à droite. Les améliorations prioritaires portent maintenant sur la qualité du contenu affiché et la cohérence entre les écrans.

Les problèmes les plus importants sont :

1. les réponses affichent encore des données internes (`[mock:...]`, JSON, rôle arbitre) ;
2. le panneau droit présente un texte brut au lieu d’un document de consensus structuré ;
3. les pages Providers, Configurations et Paramètres sortent du shell principal ;
4. l’accueil desktop est trop vide et les suggestions prennent trop de place ;
5. l’accueil mobile est fonctionnel mais trop comprimé ;
6. Providers est trop long sur mobile et Configurations manque de hiérarchie.

## 2. Objectif de la phase

Faire passer l’application d’une interface techniquement correcte à une expérience produit cohérente et crédible :

```text
Entrée utilisateur
        ↓
Analyse multi-modèles
        ↓
Réponse propre et lisible
        ↓
Workspace de consensus
        ↓
Décision / export / action suivante
```

## 3. Priorités

### P0 — Bloquant perception produit

- Nettoyer les réponses finales.
- Supprimer le JSON interne de l’interface.
- Supprimer les préfixes `[mock:...]`.
- Afficher une synthèse structurée.
- Uniformiser le shell sur toutes les pages.

### P1 — Important pour la qualité UX

- Transformer le panneau droit en document de consensus.
- Repenser l’accueil desktop.
- Optimiser l’accueil mobile.
- Réduire la densité de Providers.
- Refaire la hiérarchie de Configurations.

### P2 — Finition et robustesse

- Améliorer les micro-interactions.
- Renforcer les états hover/focus.
- Ajouter les tests responsive et accessibilité.
- Corriger les warnings de configuration détectés en environnement de déploiement.

## 4. Lot 0 — Stabiliser l’environnement d’audit

### Objectif

Garantir qu’une session de test peut parcourir toute l’application sans erreur runtime et avec une authentification cohérente.

### Actions

- Vérifier les clés Clerk de l’environnement utilisé en déploiement.
- Vérifier que les pages publiques et authentifiées utilisent le même shell attendu.
- Vérifier les données de démonstration existantes.
- Ajouter des conversations de démonstration avec réponses structurées.
- Vérifier le warning Clerk lié aux clés de développement.

### Critères d’acceptation

- L’accueil se charge sans erreur console bloquante.
- Les routes `/`, `/providers`, `/configurations` et `/parametres` sont accessibles.
- Une conversation de démonstration contient une synthèse lisible.
- La session de test ne nécessite pas de ressaisie de secrets.

## 5. Lot 1 — Nettoyer le contrat de sortie

### Problème observé

La synthèse finale affiche actuellement une sortie du type :

```text
[mock:chatgpt-5.6] Réponse de rôle arbitre final pour « {"question": ... }
```

Le mock et certains prompts traitent le payload JSON du workflow comme s’il s’agissait de la question utilisateur.

### Actions techniques

#### 5.1 Parser le payload du mock

Fichier principal : `src/gateway/adapters/mock.ts`

Ajouter une extraction défensive :

```ts
function extractQuestion(input: string): string {
  try {
    const parsed = JSON.parse(input) as { question?: string };
    return parsed.question ?? input;
  } catch {
    return input;
  }
}
```

Le mock doit utiliser la question extraite et non le JSON complet.

#### 5.2 Créer une sortie mock réaliste

La sortie finale mock doit fournir un Markdown exploitable :

```md
## Recommandation

La stratégie B est la plus fiable selon les critères analysés.

## Résumé

- ...
- ...

## Points d'accord

- ...

## Points de désaccord

- ...

## Limites

...

## Prochaine étape

...
```

#### 5.3 Renforcer le prompt final

Fichier principal : `src/orchestrator/prompts.ts`

Le prompt doit interdire explicitement :

- le JSON brut ;
- les noms de providers ;
- les noms de rôles internes ;
- les préfixes `[mock:...]` ;
- la répétition de la question ;
- les formulations de type “contexte reçu” ;
- les détails d’implémentation.

Le prompt doit imposer une structure Markdown stable :

1. Recommandation ;
2. Résumé ;
3. Points d’accord ;
4. Points de désaccord ;
5. Limites ;
6. Prochaine étape.

#### 5.4 Ajouter un nettoyage défensif

Créer une fonction de sanitation avant persistance et avant affichage. Elle doit retirer les artefacts connus, sans masquer une erreur réelle.

### Critères d’acceptation

- Aucune réponse utilisateur ne contient `[mock:`.
- Aucune réponse utilisateur ne contient le payload JSON complet.
- Aucune réponse finale ne commence par “Réponse de rôle”.
- Une question en français produit une réponse en français.
- La réponse finale contient au minimum une recommandation et une limite.

## 6. Lot 2 — Structurer le rapport de consensus

### Objectif

Faire de la réponse finale un objet métier exploitable, et pas uniquement une chaîne Markdown.

### Contrat recommandé

Dans `src/contracts/workflow.ts` :

```ts
export interface ConsensusReport {
  recommendation: string;
  confidence?: "low" | "medium" | "high";
  summary: string[];
  agreements: string[];
  disagreements: string[];
  limitations: string[];
  nextSteps: string[];
}
```

Ajouter progressivement ce rapport à `RunResult` :

```ts
export interface RunResult {
  // champs existants
  consensusReport?: ConsensusReport;
}
```

### Stratégie de compatibilité

- Conserver `finalSynthesis.text` pour les anciens runs.
- Utiliser `consensusReport` pour les nouveaux runs.
- Prévoir un fallback Markdown si le rapport structuré est absent.
- Ne pas casser les conversations déjà persistées.

## 7. Lot 3 — Refaire le panneau output

### Problème observé

Le panneau de droite existe, mais il affiche essentiellement le même texte brut que la carte centrale.

### Cible

```text
Consensus
Comparer deux stratégies...

[Synthèse] [Comparaison] [Workflow] [Métriques]

Recommandation
Résumé
Points d'accord
Points de désaccord
Limites
Prochaine étape
```

### Actions

- Utiliser `ConsensusReport` lorsqu’il est disponible.
- Ajouter une carte principale `Recommandation`.
- Ajouter un badge de confiance lorsque la donnée existe.
- Transformer les sections en blocs visuels.
- Garder les détails techniques dans `Workflow` et `Métriques`.
- Ajouter un bouton d’export au niveau du panneau.
- Ajouter une action copier la synthèse complète.
- Ne pas afficher deux fois le même texte intégral.

### Règle de rendu

Dans la conversation :

```text
Recommandation courte...
[Voir la synthèse complète]
```

Dans le panneau :

```text
Rapport complet et structuré
```

### Critères d’acceptation

- Le panneau ne contient plus de JSON interne.
- La recommandation est visible sans scroll important.
- Les quatre onglets sont utilisables.
- La fermeture du panneau conserve l’onglet actif.
- Sur mobile, le panneau devient un écran ou drawer plein écran.

## 8. Lot 4 — Shell global et navigation

### Problème observé

Les pages secondaires affichent uniquement un lien “Retour” et perdent la sidebar et le contexte de navigation.

### Cible

Desktop :

```text
Sidebar persistante | Contenu de la page
```

Mobile :

```text
[☰] Consensus                 [action]
Contenu de la page
```

### Actions

- Utiliser un layout partagé pour toutes les routes applicatives.
- Conserver la navigation principale sur Providers, Configurations et Paramètres.
- Afficher l’élément de navigation actif.
- Ajouter le bouton “Ouvrir le menu” sur toutes les pages mobiles.
- Harmoniser les headers de page.
- Garder le bouton retour uniquement comme action secondaire.

### Critères d’acceptation

- Les pages secondaires ne semblent plus isolées.
- L’utilisateur peut revenir au chat en un clic.
- Le menu mobile est disponible partout.
- Le shell ne provoque pas de débordement horizontal.

## 9. Lot 5 — Refonte de l’accueil desktop

### Problèmes observés

- Trop d’espace vertical vide.
- Titre générique.
- Suggestions trop longues et présentées comme des pilules.
- Composer trop petit dans un grand viewport.

### Cible éditoriale

```text
Prenez une décision avec plusieurs points de vue.

Consensus compare plusieurs analyses indépendantes
et fait ressortir les accords, désaccords et risques.
```

### Actions

- Remonter le bloc d’accueil.
- Réduire l’espace autour de l’icône.
- Tester une icône de marque de 40 à 56 px.
- Remplacer les pilules par une grille de quatre cartes.
- Raccourcir les titres des suggestions.
- Ajouter une micro-description visible ou au survol.
- Augmenter légèrement la largeur du composer.
- Supprimer le doublon entre “Nouvelle conversation” et “Nouvelle”.

### Suggestions recommandées

```text
Comparer des stratégies
Challenger une hypothèse
Analyser une décision
Évaluer une réglementation
```

## 10. Lot 6 — Refonte responsive mobile

### Résultats observés à 390 × 844

- Pas de débordement horizontal.
- Sidebar correctement masquée.
- Menu mobile disponible sur l’accueil.
- Composer utilisable.
- Bannière trop haute.
- Suggestions trop longues.
- Pages secondaires sans navigation globale.

### Actions

- Réduire la bannière mode démo à une ligne ou deux maximum.
- Utiliser des cartes de suggestions plus courtes.
- Rendre le composer sticky en bas.
- Conserver une zone tactile minimale de 44 × 44 px.
- Transformer le workspace output en plein écran.
- Rendre les tabs du workspace scrollables horizontalement si nécessaire.
- Ajouter un header mobile cohérent aux pages secondaires.
- Tester les claviers virtuels iOS et Android.

### Critères d’acceptation

- Aucun débordement horizontal à 320, 360, 390 et 430 px.
- Le composer reste accessible lorsque le clavier virtuel est ouvert.
- Le panneau output est lisible en plein écran.
- Les boutons principaux restent utilisables au toucher.

## 11. Lot 7 — Providers

### Problèmes observés

- Page longue sur mobile.
- Huit providers affichés avec le même poids.
- Peu de distinction entre provider actif et provider disponible.

### Cible

```text
Providers configurés
  OpenAI · Connecté

Providers disponibles
  Anthropic
  Gemini
  DeepSeek
  ...
```

### Actions

- Regrouper par statut.
- Trier les providers configurés en premier.
- Réduire les cartes non configurées.
- Utiliser des sections repliables sur mobile.
- Ajouter un statut visuel clair.
- Afficher le modèle associé dans une ligne secondaire.
- Afficher les messages de succès et d’erreur dans la carte concernée.
- Ne jamais afficher de clé non masquée.

## 12. Lot 8 — Configurations

### Problèmes observés

- Hiérarchie faible.
- Profils et configurations sauvegardées peu différenciés.
- Présentation trop technique.

### Actions

- Créer des cartes de profil comparables.
- Ajouter vitesse, coût et nombre d’analystes.
- Montrer la configuration active.
- Utiliser des badges pour `Démo`, `Actif`, `Personnalisé`.
- Rendre le bouton `Utiliser` plus visible.
- Regrouper le formulaire par rôle.
- Ajouter une estimation de coût avant sauvegarde.

## 13. Lot 9 — Paramètres

### État

La page Paramètres est la plus stable visuellement et fonctionne correctement sur mobile.

### Améliorations

- Conserver les sections actuelles.
- Remplacer les lignes techniques par des cartes de statut.
- Garder les liens d’action proches des informations concernées.
- Ajouter un statut visuel pour Clerk, persistance, mode démo et chiffrement.
- Vérifier la cohérence du header avec les autres pages.

## 14. Lot 10 — Accessibilité et micro-interactions

### Actions

- Vérifier les contrastes des textes gris et des placeholders.
- Ajouter des états hover/focus visibles aux suggestions.
- Ajouter `aria-live` pour la progression de l’analyse.
- Vérifier les labels des boutons iconographiques.
- Ajouter `aria-expanded` aux drawers et accordéons.
- Respecter `prefers-reduced-motion`.
- Remplacer les caractères Unicode ambigus par les icônes du design system.
- Tester la navigation clavier du shell et du workspace.

## 15. Ordre de développement recommandé

```text
Lot 0  Environnement
  ↓
Lot 1  Contrat de sortie
  ↓
Lot 2  Rapport structuré
  ↓
Lot 3  Workspace output
  ↓
Lot 4  Shell global
  ↓
Lot 5  Accueil desktop
  ↓
Lot 6  Responsive mobile
  ↓
Lot 7  Providers
  ↓
Lot 8  Configurations
  ↓
Lot 9  Paramètres
  ↓
Lot 10 Accessibilité
```

## 16. Tests à ajouter

### Tests fonctionnels

- Une réponse mock propre est générée.
- Une réponse finale ne contient aucun JSON interne.
- Une synthèse existante reste lisible après migration.
- Le workspace s’ouvre depuis une carte de réponse.
- Le workspace se ferme sans perdre l’état.
- Les onglets affichent les bonnes données.
- La navigation globale fonctionne sur toutes les routes.

### Tests responsive

- Accueil à 320 × 800.
- Accueil à 390 × 844.
- Accueil à 430 × 932.
- Conversation longue sur mobile.
- Workspace ouvert sur mobile.
- Providers sur mobile.
- Configurations sur mobile.
- Paramètres sur mobile.

### Tests visuels

Captures de référence à conserver pour :

- accueil desktop ;
- accueil mobile ;
- conversation avec synthèse ;
- panneau droit ouvert ;
- panneau droit mobile ;
- Providers configurés ;
- Providers non configurés ;
- Configurations ;
- Paramètres.

## 17. Critères de sortie de la phase

La phase est considérée comme terminée lorsque :

- les réponses finales sont propres et lisibles ;
- le JSON et les artefacts mock ne sont plus visibles ;
- le workspace présente un rapport structuré ;
- les pages secondaires partagent le même shell ;
- aucune route ne déborde à 320 px de largeur ;
- le composer fonctionne sur desktop et mobile ;
- Providers est compréhensible sans parcourir huit cartes identiques ;
- Configurations différencie clairement les profils et l’actif ;
- les parcours principaux sont vérifiés par tests automatisés et captures visuelles.

## 18. Décisions recommandées

- Le workspace ne s’ouvre pas automatiquement pour chaque réponse ; il s’ouvre sur action ou pour les outputs longs.
- La carte centrale affiche un aperçu, le workspace affiche le rapport complet.
- `ConsensusReport` devient le format métier privilégié.
- Le Markdown reste le fallback et le format d’export.
- Le shell global est partagé par toutes les pages applicatives.
- Le mobile utilise un drawer pour la navigation et un écran plein pour le workspace.
