# Prompt — Recherche des tarifs des providers

Prompt prêt à l'emploi pour vérifier, corriger et compléter la table de tarifs codée en dur dans `src/gateway/cost.ts`.

---

## Prompt

**Contexte.** Je maintiens une table de tarifs codée en dur dans une application qui orchestre plusieurs LLM. Chaque prix est saisi manuellement en USD par million de tokens (`promptPer1M`, `completionPer1M`). Je dois vérifier, corriger et compléter ces tarifs à partir de la documentation officielle des fournisseurs. Toutes les infos à retourner sont en français, les identifiants de modèles en anglais.

**Liste exhaustive des modèles à traiter** (identifiant exact utilisé dans le code `provider/model`) :

- OpenAI : `openai/chatgpt-5.6`
- Anthropic : `anthropic/claude-opus-5`, `anthropic/claude-sonnet-5`
- Google Gemini : `gemini/gemini-3.7-flash`
- DeepSeek : `deepseek/deepseek-v4`
- Alibaba Qwen (DashScope) : `qwen/qwen-3.8-max`
- Moonshot Kimi : `kimi/kimi-k3`
- Zhipu GLM (BigModel) : `glm/glm-5.3`
- xAI Grok : `xai/grok-4.6`
- Meta (Model API) : `meta/muse-spark-1.2`
- OpenRouter (routage `auto`) et ses modèles explicites : `openrouter/openai/gpt-5.6-sol`, `openrouter/openai/gpt-5.6-luna`, `openrouter/google/gemini-3.7-flash`, `openrouter/x-ai/grok-4.5`, `openrouter/meta-llama/muse-spark-latest`, `openrouter/deepseek/deepseek-v4-flash`, `openrouter/deepseek/deepseek-v4-pro`, `openrouter/moonshotai/kimi-k3`, `openrouter/qwen/qwen-3.8-max`, `openrouter/anthropic/claude-opus-5`, `openrouter/anthropic/claude-sonnet-5`
- ZenMux (routage `auto`) et les mêmes modèles explicites que ci-dessus, en préfixant par `zenmux/` au lieu de `openrouter/`

**Tâches.**

1. Pour chacun de ces modèles, trouver la **page officielle de tarification** du fournisseur (pas des agrégateurs de second rang : utiliser le site officiel, la documentation API, ou pour OpenRouter/ZenMux leur propre catalogue).

2. Relever pour chaque modèle :
   - prix d'entrée en USD **par 1M de tokens** (input)
   - prix de sortie en USD **par 1M de tokens** (output)
   - la devise affichée et sa conversion en USD si nécessaire
   - l'URL exacte de la page consultée
   - la date de consultation
   - les éventuelles **conditions** : remise par lots, cache, fenêtre contextuelle, seuils, gratuits (`$0`)

3. Pour **OpenRouter et ZenMux** uniquement : documenter précisément comment récupérer ces prix **programmatiquement** via leur API, en citant les endpoints exacts et le schéma de réponse. En particulier : existe-t-il un endpoint « models » qui renvoie les champs `pricing.prompt` et `pricing.completion` par modèle ? Quel est le format (USD par token ? par 1M ?) ? Est-ce que le coût réel d'une génération est aussi renvoyé dans la réponse d'appel (champ `cost`) ? Donner des exemples de réponse réels et les URL de documentation associées. Indiquer aussi ce que renvoie le routage `auto` (modèle effectivement sélectionné et son prix).

4. Pour chaque fournisseur, vérifier si les **identifiants de modèles** utilisés dans mon code correspondent bien aux identifiants officiels de l'API (ex. `chatgpt-5.6`, `gemini-3.7-flash`, `grok-4.6`…). Si un identifiant est obsolète ou introuvable, indiquer le bon identifiant et le modèle à jour.

5. Croiser avec les valeurs actuellement codées et produire un **tableau comparatif** : `provider/model | prix entrée | prix sortie | page | date | écart vs valeur actuelle`. Encadrer chaque prix vérifié, et marquer explicitement les prix que tu n'as **pas pu** confirmer sur une source officielle.

**Format de livraison.** Réponds en markdown : 1) tableau comparatif complet ; 2) section OpenRouter/ZenMux avec endpoints et exemples de réponses ; 3) liste des identifiants corrigés ; 4) liste des sources consultées avec URL et date. Précise à chaque fois ton niveau de confiance (officiel confirmé / estimé / introuvable).

---

## Contexte technique (pour l'agent qui exécute)

- Table des prix actuelle : `src/gateway/cost.ts` (`PRICING`, valeurs `promptPer1M` / `completionPer1M` en USD par 1M de tokens).
- Modèles déclarés : `src/config/models.ts` (`MODELS_BY_PROVIDER`).
- Providers supportés : `src/gateway/index.ts` (`KNOWN_PROVIDERS`) : openai, anthropic, gemini, deepseek, qwen, kimi, glm, xai, meta, openrouter, zenmux, mock.