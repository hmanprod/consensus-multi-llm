# Plan de refonte des configurations

## Configurations personnalisées et intégration OpenRouter

Projet Consensus Multi-LLM — Document de cadrage et plan d’implémentation.

> **Décision proposée** — Remplacer les profils système « Économique » et « Approfondi » par une liste unique de configurations personnalisées, toutes modifiables, et permettre la sélection de modèles explicites via OpenRouter.

## 1. Contexte et objectif

L’interface actuelle combine deux profils prédéfinis et un éditeur de configurations personnalisées. Cette organisation ajoute une couche de choix inutile et rend les tests de variantes moins simples. Le présent plan propose de faire des configurations personnalisées l’unique concept visible et manipulable.

Objectifs :

- simplifier l’expérience de configuration et faciliter la comparaison de plusieurs variantes ;
- permettre l’utilisation de modèles disponibles via OpenRouter, par exemple ChatGPT 5.6 via OpenRouter.

## 2. Audit de l’existant

### 2.1 Interface et profils

- La page affiche encore les profils « Économique » et « Approfondi ».
- Les profils sont codés dans la configuration applicative et utilisés comme références actives.
- L’utilisateur peut créer une configuration, mais pas modifier, renommer, dupliquer ou supprimer une configuration existante.
- Le formulaire actuel est conçu uniquement pour la création.

### 2.2 Persistance et configuration active

- Le schéma Prisma possède déjà une entité `OrchestrationConfiguration` suffisamment riche.
- La configuration active peut encore être une référence de type `profile` ou `saved`.
- Le fallback serveur revient vers le profil économique si une configuration est absente.
- Aucune configuration personnalisée initiale n’est créée automatiquement pour un nouvel utilisateur.

### 2.3 OpenRouter

- Un adapter OpenRouter existe déjà côté moteur et utilise l’API Chat Completions.
- La clé OpenRouter est déjà supportée par la gestion des providers.
- L’interface ne propose actuellement que le modèle générique « Auto (OpenRouter) ».
- Les identifiants explicites, par exemple `openai/gpt-5.6`, ne sont pas encore proposés dans le catalogue.

## 3. Modèle cible

Chaque utilisateur dispose d’une liste de configurations personnalisées. Toutes les configurations ont le même statut fonctionnel ; leurs différences résident dans leur nom, leurs modèles et leurs paramètres.

- **Configuration initiale** : créée automatiquement et activée pour chaque utilisateur, par exemple « Configuration économique ».
- **Configuration personnalisée** : créable, modifiable et duplicable, par exemple « Recherche approfondie ».
- **Configuration active** : référence toujours une configuration sauvegardée, au format `saved:id`.
- **Modèle OpenRouter** : provider OpenRouter et slug explicite, par exemple `openai/gpt-5.6`.

## 4. Fonctionnalités à implémenter

### 4.1 Gestion des configurations

- Créer une configuration.
- Modifier une configuration.
- Renommer une configuration.
- Dupliquer une configuration.
- Supprimer une configuration.
- Activer une configuration.
- Consulter les modèles et le coût estimé d’une configuration.

### 4.2 Éditeur partagé

Le même éditeur doit être utilisé pour la création et la modification, avec un mode `create` ou `edit`.

Les champs doivent couvrir :

- les modèles par rôle ;
- le nombre d’analystes ;
- le budget ;
- le nombre de tokens ;
- le délai d’expiration ;
- le nombre de rounds ;
- le seuil d’accord ;
- l’activation de la recherche.

### 4.3 Règles de sécurité

- Vérifier côté serveur que la configuration appartient à l’utilisateur.
- Empêcher la suppression de la dernière configuration.
- Empêcher la suppression de la configuration active ou activer automatiquement une autre configuration.
- Valider chaque payload avec un schéma Zod.
- Ne jamais exposer les clés API dans les réponses ou les logs.

## 5. Intégration OpenRouter

À court terme, un modèle doit être représenté par un couple `provider/model`. OpenRouter reste le provider, tandis que le slug transmis à l’API identifie le modèle sous-jacent.

Exemple :

```text
Provider : OpenRouter
Modèle   : openai/gpt-5.6
Libellé  : ChatGPT 5.6 · via OpenRouter
```

### 5.1 Première version

- Ajouter plusieurs modèles OpenRouter explicites au catalogue.
- Permettre un identifiant personnalisé lorsqu’un modèle n’est pas encore dans le catalogue.
- Afficher clairement « via OpenRouter » dans les cartes et le détail des rôles.
- Adapter l’estimation de coût au modèle sélectionné ou afficher un coût inconnu explicitement.

### 5.2 Évolution dynamique

- Récupérer le catalogue OpenRouter côté serveur.
- Mettre en cache la liste des modèles.
- Afficher le contexte, les prix entrée/sortie et le fournisseur sous-jacent.
- Filtrer les modèles incompatibles avec les besoins du workflow.

## 6. Plan d’implémentation

1. **Refactor métier** — Supprimer les profils comme concept actif et préparer la compatibilité temporaire.
2. **CRUD et persistance** — Ajouter `create`, `update`, `rename`, `duplicate`, `delete` et l’activation dans les actions serveur et les stores.
3. **Initialisation utilisateur** — Créer de façon idempotente la configuration économique initiale et l’activer.
4. **Refonte UI** — Remplacer les profils par une liste de cartes et un éditeur partagé.
5. **Modèles OpenRouter** — Ajouter les slugs explicites, les libellés et la sélection dans le `RolePicker`.
6. **Migration** — Convertir les anciennes références `profile:economical` et `profile:best`.
7. **Catalogue dynamique** — Ajouter la synchronisation serveur du catalogue OpenRouter.
8. **Tests et validation** — Tester le CRUD, l’isolation utilisateur, les fallbacks, les coûts et l’exécution OpenRouter.

## 7. Évolution des données

- Faire évoluer `ActiveConfig` vers une référence `saved` comme format cible.
- Conserver temporairement la lecture des anciennes références `profile`.
- Utiliser `configJson` comme source complète de vérité pendant la transition.
- Prévoir une migration ou une initialisation applicative pour les utilisateurs existants.

## 8. Critères d’acceptation

- [ ] Un nouvel utilisateur voit au moins une configuration personnalisée déjà créée.
- [ ] La page ne présente plus les sections « Profils recommandés ».
- [ ] Une configuration existante peut être modifiée sans créer un doublon.
- [ ] Une configuration peut être dupliquée, renommée et supprimée selon les règles prévues.
- [ ] La configuration active est toujours une configuration sauvegardée.
- [ ] OpenRouter permet de sélectionner un modèle explicite comme `openai/gpt-5.6`.
- [ ] Le modèle sélectionné est transmis au moteur avec son provider et son slug corrects.
- [ ] Les anciennes références sont migrées sans perte de configuration.

## 9. Ordre recommandé

1. CRUD et initialisation des configurations.
2. Migration de la configuration active.
3. Nouvelle interface personnalisée.
4. Modèles OpenRouter explicites.
5. Catalogue OpenRouter dynamique.
6. Nettoyage du code de compatibilité et validation finale.

## 10. Références du dépôt

- `src/app/configurations/ConfigurationsClient.tsx`
- `src/app/actions.ts`
- `src/config/profiles.ts`
- `src/config/models.ts`
- `src/contracts/workflow.ts`
- `src/lib/store/types.ts`
- `src/lib/store/memory.ts`
- `src/lib/store/prisma.ts`
- `src/gateway/adapters/openrouter.ts`
- `prisma/schema.prisma`
