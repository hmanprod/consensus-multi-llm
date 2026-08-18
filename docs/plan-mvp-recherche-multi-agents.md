# Plan d’implémentation — MVP recherche multi-agents

> **État de mise en œuvre (18/08/2026)**
>
> - Lots 1 à 5 **implémentés** : contrats (`src/contracts/research.ts`), config (`src/config/models.ts`, `src/config/profiles.ts`, `src/config/research.ts`), adapters natifs (Gemini, Responses openai/meta/xai, Anthropic, Kimi) + mock, Research Gateway (`src/research/gateway.ts`), Analyst Agent (`src/research/analyst-agent.ts`), workflow `AB → ABC` avec provenance, persistance via `RunResult.resultJson`, onglet **Sources** + sections « Informations non vérifiées » / « Sources » dans la synthèse, timeline par analyste, masquage de la page Configurations en mode démo.
> - Lot 6 **amorcé** : corpus `corpus/questions.ts` (32 questions, 4 catégories), harness `scripts/benchmark.ts` (variantes single/multi × recherche on/off), rapports dans `benchmark-results/` (gitignoré).
> - **En attente de clés API** : test des adapters natifs réels (Gemini/OpenAI/Meta/xAI/Kimi/Anthropic) et benchmark complet `native` avec notation qualitative.

## 1. Décision

Le MVP doit valider l’hypothèse selon laquelle des analystes indépendants, équipés d’une recherche web et de preuves traçables, puis consolidés en `AB → ABC`, produisent une meilleure synthèse qu’un LLM sans recherche.

Le MVP n’utilise pas encore le runtime Hermès. Hermès, les skills autonomes et les profils d’agents seront traités en V2. Dans le MVP, l’orchestrateur appelle directement les analystes avec leurs outils natifs ou un Research Gateway de fallback.

## 2. Architecture MVP

```text
Question → Orchestrateur → Analystes indépendants
                          ├── ChatGPT 5.6 (OpenAI)
                          ├── Gemini 3.7 Flash
                          ├── Muse Spark (Meta Model API)
                          ├── Grok 4.6 (xAI)
                          └── Kimi (Moonshot)
                                  ↓
                          dossiers avec preuves
                                  ↓
                          consolidation AB → ABC
                                  ↓
                          révisions → synthèse finale
```

Le workflow reste `A → B → S → R → F` : compréhension, recherches indépendantes, consolidation, révisions et synthèse.

## 3. Recherche par analyste

Le MVP teste exclusivement les **outils de recherche natifs** de chaque provider. Aucun moteur tiers (Exa, Tavily, Brave, Firecrawl…) ni API OSINT n’est utilisé tant que l’hypothèse n’est pas validée.

| Provider | Outil natif | Requête | Citations renvoyées |
|---|---|---|---|
| OpenAI (ChatGPT) | `web_search` | Responses API `POST /v1/responses`, `tools:[{"type":"web_search"}]` | `web_search_call.action.query`, `sources[]`, `output_text` + annotations `url_citation` |
| Gemini 3.7 Flash | `google_search` | `generateContent`, `tools:[{"google_search":{}}]` | `groundingMetadata.webSearchQueries`, `groundingChunks[].web.{uri,title}`, `groundingSupports[]` |
| Muse Spark (Meta) | `web_search` | Responses API `https://api.meta.ai/v1/responses`, `tools:[{"type":"web_search"}]` | `web_search_call`, `url_citation`, `web_search_call.results` (opt-in) |
| Grok (xAI) | `web_search` (+ `x_search`) | Responses API `https://api.x.ai/v1/responses`, `tools:[{"type":"web_search"}]` | `web_search_call`, `url_citation` |
| Anthropic (Claude) | `web_search` + `web_fetch` | Messages, `tools:[{"type":"web_search_20250305"}]` | `web_search_tool_result`, `citations[]` (`web_search_result_location`) |
| Kimi | `$web_search` | Chat Completions, `tools:[{"type":"builtin_function","function":{"name":"$web_search"}}]`, boucle `tool_calls` | `search_results[].url` renvoyés dans les arguments écho |
| OpenRouter | `openrouter:web_search` | `tools:[{"type":"openrouter:web_search","engine":"native"}]` | citations du provider sous-jacent |

OpenAI, Meta et xAI étant compatibles **Responses API**, un seul adapter générique (base URL + clé + modèle) couvre les trois providers.

Le groupe d’analystes par défaut du MVP est donc :

```text
Analyste A — ChatGPT 5.6 (OpenAI)      → web_search
Analyste B — Gemini 3.7 Flash          → google_search
Analyste C — Muse Spark (Meta)         → web_search (api.meta.ai)
Analyste D — Grok 4.6 (xAI)            → web_search
Analyste E — Kimi                      → $web_search
```

Muse Spark passe par l’API officielle Meta Model API (`MODEL_API_KEY`, base `https://api.meta.ai/v1`). Si l’accès n’est pas disponible dans l’environnement de déploiement, l’agent bascule vers le modèle de secours défini côté serveur (OpenRouter en premier recours) sans exposer de configuration provider à l’utilisateur. La disponibilité et les conditions d’accès sont vérifiées à l’installation.

Le mode utilisé doit être enregistré : `native | mock | disabled`. Un provider sans outil natif ou sans clé configurée bascule en recherche désactivée (`disabled`) ou en mock (démo) ; il n’y a jamais de fallback vers un moteur de recherche tiers.

Le groupe d’analystes reste **personnalisable comme l’approche actuelle** : profils serveur (`economical`, `best`, `custom`) composant librement les analystes A–E, budgets, timeouts et modèles définis côté serveur.

## 4. Contrats

Créer `src/contracts/research.ts` avec les contrats suivants :

- `ResearchPolicy` : activation, nombre maximal de recherches et sources, timeout, coût et fraîcheur ;
- `ResearchSource` : URL, titre, extrait, provider, type de source, date et accessibilité ;
- `ResearchEvidence` : affirmation, sources associées et confiance ;
- `AnalystDossier` : analyse, conclusion, requêtes, sources, preuves, incertitudes et mode d’exécution.

Chaque `AnalysisOutput` doit pouvoir contenir un `AnalystDossier` optionnel.

## 5. Research Gateway

Créer une abstraction indépendante du modèle qui **résout le mode de recherche natif par provider** et normalise sources et preuves.

Le gateway :

- choisit le mode `native | mock | disabled` selon le provider, la clé configurée et le modèle ;
- invoque l’adapter natif du provider (Google Search grounding, Responses `web_search`, Anthropic web_search, Kimi `$web_search`, OpenRouter `openrouter:web_search`) ;
- normalise les citations reçues en `ResearchSource` et `ResearchEvidence` ;
- fournit un **MockResearch** pour le mode démo et les tests, sans clé ;
- trace le mode d’exécution, les requêtes exécutées et les erreurs.

Le moteur généraliste découvre les pistes via son outil natif. Une source primaire est privilégiée par l’analyste, mais son absence doit être signalée.

## 6. Analyst Agent direct

Créer `src/research/analyst-agent.ts`, sans runtime Hermès.

Responsabilités :

- recevoir question, modèle et politique de recherche ;
- détecter les tools natifs disponibles ;
- utiliser le gateway en fallback ;
- séparer faits, interprétations, hypothèses et prédictions ;
- associer les affirmations importantes aux preuves ;
- normaliser sources et citations ;
- appliquer budgets, timeouts et annulation ;
- retourner un dossier structuré ou une erreur contrôlée.

Les analystes travaillent en parallèle, avec un contexte et un budget isolés. Ils ne voient pas les recherches des autres avant la consolidation.

## 7. Consolidation

```text
Dossier A + Dossier B → Dossier AB
Dossier AB + Dossier C → Dossier ABC
```

Chaque consolidation identifie faits communs, informations uniques, sources contradictoires, affirmations insuffisamment prouvées, différences d’interprétation, conclusion provisoire, confiance et provenance.

## 8. Révisions et synthèse

Pendant `R`, chaque analyste reçoit sa contribution initiale, la consolidation et les contradictions détectées. Il confirme, corrige ou nuance sa conclusion.

La synthèse finale doit présenter recommandation, faits principaux, accords, désaccords, sources, limites, informations non vérifiées et niveau de confiance.

## 9. Périmètre interface

Les pages Providers, Configurations et Profils ne sont pas nécessaires au parcours MVP. Elles peuvent être masquées ou désactivées sans supprimer leur code. Les credentials restent une configuration technique côté serveur.

Les modèles, modes de recherche et politiques sont définis dans une configuration serveur versionnée. L’utilisateur ne configure pas encore librement les providers ou profils.

## 10. Lots de réalisation

### Lot 1 — Contrats et configuration serveur

- créer les contrats de recherche ;
- définir les politiques et limites ;
- définir côté serveur les analystes A–E : ChatGPT (OpenAI), Gemini 3.7 Flash (`gemini-3.7-flash`), Muse Spark (`muse-spark-*`, base `https://api.meta.ai/v1`), Grok 4.6 (`grok-4.6`), Kimi (`kimi-k3`, base `https://api.moonshot.ai/v1`) ;
- définir les profils `economical` / `best` / `custom` ;
- écrire les tests de validation.

### Lot 2 — Adapters de recherche natifs

- intégrer les outils natifs : Gemini `google_search`, Responses `web_search` (adapter générique pour OpenAI/Meta/xAI), Anthropic web_search/web_fetch, Kimi `$web_search`, OpenRouter `openrouter:web_search` (`engine: "native"`) ;
- créer le MockResearch pour le mode démo ;
- normaliser citations et sources ;
- tracer le mode d’exécution et les erreurs.

### Lot 3 — Analyst Agent

- créer l’agent direct ;
- intégrer recherche native et fallback ;
- produire `AnalystDossier` ;
- imposer les règles de preuves ;
- gérer budgets, timeouts et annulation.

### Lot 4 — Workflow

- remplacer les appels analystes directs ;
- intégrer les dossiers dans `S` ;
- implémenter `AB → ABC` avec provenance ;
- adapter les révisions et la synthèse.

### Lot 5 — Persistance et interface

- persister requêtes, sources, preuves et coûts ;
- afficher citations, limites et modes de recherche ;
- compléter la timeline ;
- masquer les pages de configuration non nécessaires.

### Lot 6 — Validation

- constituer 30 à 50 questions ;
- comparer sans recherche, recherche native simple, multi-analystes et `AB → ABC` ;
- mesurer exactitude, couverture, qualité des sources, traçabilité, contradictions, coût et latence ;
- produire un rapport de validation.

**Implémentation actuelle** : `corpus/questions.ts` (32 questions, catégories IA & PME / Tech & Web / Data & Sécurité / Stratégie) et `scripts/benchmark.ts` (`npx tsx scripts/benchmark.ts [--limit=N] [--variants=single-no-search,single-search,multi-no-search,multi-search]`). Rapports `latest.json` / `latest.md` dans `benchmark-results/`. Les 4 variantes sont comparables sans clé (mode mock/disabled) ; avec clés, le mode `native` est utilisé automatiquement. La notation qualitative (exactitude, couverture, qualité des sources, traçabilité, contradictions) reste à compléter dans la grille manuelle du rapport.

## 11. Tests d’acceptation

- chaque analyste recherche indépendamment ;
- natif, mock et disabled sont traçables ;
- les citations soutiennent les affirmations ;
- AB et ABC conservent la provenance ;
- les erreurs sont visibles et contrôlées ;
- les limites sont respectées ;
- le mode démo fonctionne sans credentials (mock) ;
- le benchmark mesure le gain de la recherche et de la consolidation ;
- aucun secret n’apparaît dans les logs.

## 12. V2 — Hermès

Après validation du MVP, la V2 pourra ajouter runtime Hermès, skills autonomes, profils d’agents, mémoire isolée, boucles adaptatives et configuration utilisateur.

L’ancien plan détaillé est conservé dans :

`docs/plan-v2-hermes-recherche-multi-agents.md`
