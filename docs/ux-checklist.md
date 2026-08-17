# Checklist UX / UI — Consensus

Vérifications à passer avant chaque livraison de la refonte UX. Document de travail : `docs/plan-refonte-ux-ui.md`.

## Accueil et composer

- [ ] L'écran vide présente une proposition de valeur claire en moins de 30 secondes.
- [ ] Au moins 3 exemples de questions sont cliquables.
- [ ] Cliquer un exemple remplit correctement le composer.
- [ ] Le bouton d'envoi est atteignable au clavier et a un nom accessible.
- [ ] `Entrée` envoie, `Maj + Entrée` insère une nouvelle ligne.
- [ ] Le composer s'agrandit automatiquement avec le texte et est borné (max-height).
- [ ] Le profil actif et le nombre d'analystes sont visibles dans le composer.
- [ ] Pendant l'analyse, le bouton d'arrêt remplace le bouton d'envoi.

## Conversation

- [ ] Une réponse est lisible sans ouvrir le workspace.
- [ ] La conclusion / synthèse est identifiée en moins de 5 secondes.
- [ ] La réponse est rendue en Markdown structuré (jamais un bloc `<pre>` unique).
- [ ] Les actions principales (copier, approfondir, relancer, voir le consensus) sont au niveau de la réponse.
- [ ] Le composer reste utilisable après chaque réponse.
- [ ] Un message utilisateur est compact et correctement wrappé.

## Workspace output

- [ ] Le panneau s'ouvre sans navigation de page.
- [ ] Les 4 vues (Synthèse, Comparaison, Workflow, Métriques) sont accessibles.
- [ ] La fermeture (bouton ou `Échap`) conserve le contexte.
- [ ] Le panneau a son propre défilement, indépendant de la conversation (desktop).
- [ ] Sur mobile, le panneau occupe tout l'écran.
- [ ] Copier et télécharger (.md) fonctionnent.
- [ ] `prefers-reduced-motion` neutralise l'animation d'ouverture.

## Sidebar et navigation

- [ ] Les conversations sont groupées par date (Aujourd'hui, Hier, Cette semaine, Plus ancien).
- [ ] La recherche filtre la liste.
- [ ] Renommer une conversation fonctionne (`Entrée` valide, `Échap` annule).
- [ ] Supprimer demande confirmation avant suppression.
- [ ] La sidebar se rétracte sur desktop et réapparaît proprement.
- [ ] Sur mobile, la sidebar s'ouvre en drawer avec fond assombri et se ferme au clic extérieur.

## États d'exécution

- [ ] La progression indique l'étape courante et les étapes terminées.
- [ ] Les changements de progression sont annoncés aux lecteurs d'écran (`aria-live`).
- [ ] Une erreur indique la prochaine action possible.
- [ ] Le bouton « Arrêter » répond immédiatement et le composer redevient utilisable.
- [ ] Une analyse arrêtée est signalée sans casser le fil de conversation.

## Bannière providers et mode démo

- [ ] La bannière est compacte et ne domine pas visuellement.
- [ ] Le message est court (« Mode démo actif · Les analyses sont simulées »).
- [ ] Le lien « Configurer les providers » mène à la page Providers.
- [ ] La bannière se ferme pour la session.

## Configuration

- [ ] Les providers sont présentés en cartes (identité, statut, modèle, clé masquée, date).
- [ ] Les erreurs de formulaire sont proches du champ et ne révèlent jamais la clé.
- [ ] Les configurations sont présentées en fiches avec les rôles listés.
- [ ] Le formulaire avancé est regroupé par rôles et repliable.
- [ ] Les paramètres utilisent des groupes, badges et liens d'action.

## Responsive

- [ ] Desktop : sidebar + conversation centrée + workspace latéral indépendant.
- [ ] Tablette : sidebar étroite, workspace en drawer.
- [ ] Mobile : sidebar en drawer, workspace plein écran, zones tactiles ≥ 44 × 44 px.
- [ ] Aucun tableau large sans version en cartes.

## Accessibilité

- [ ] Contraste WCAG AA minimum sur tout le texte.
- [ ] Focus visible sur tous les contrôles (`:focus-visible`).
- [ ] Labels explicites pour textareas, selects et boutons icône (`aria-label`).
- [ ] `aria-expanded` sur les accordéons et menus.
- [ ] Statuts non encodés par la couleur seule (texte + badge).
- [ ] Navigation clavier dans la sidebar, les onglets et le panneau.
- [ ] Ordre de tabulation vérifié avec panneau ouvert et fermé.

## Non-régression

- [ ] Envoi d'une question en mode démo → réponse complète.
- [ ] Relancer une analyse ne casse pas la conversation.
- [ ] Créer / sélectionner / renommer / supprimer une conversation.
- [ ] Ouvrir et fermer le workspace sur la même conversation.
- [ ] `npm run lint`, `npx tsc --noEmit` et `npm run build` passent.