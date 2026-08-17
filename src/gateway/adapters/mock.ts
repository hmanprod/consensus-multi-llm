import type { GenerationResult, GenerationRequest } from "@/contracts/gateway";

const WORDS_PER_TOKEN = 0.75;

function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / WORDS_PER_TOKEN));
}

function extractQuestion(input: string): string {
  try {
    const parsed = JSON.parse(input) as { question?: string };
    if (typeof parsed.question === "string" && parsed.question.trim()) return parsed.question;
    return input;
  } catch {
    return input;
  }
}

function cleanQuestion(input: string, max = 160): string {
  return extractQuestion(input).replace(/\s+/g, " ").trim().slice(0, max);
}

function detectRole(system: string): "analyst" | "consensus" | "synthesis" | "orchestrator" {
  if (system.includes("ANALYST")) return "analyst";
  if (system.includes("SYNTHESIS") || system.includes("final arbitrator")) return "synthesis";
  if (system.includes("CONSENSUS")) return "consensus";
  if (system.includes("ORCHESTRATOR")) return "orchestrator";
  return "analyst";
}

export class MockAdapter {
  readonly provider = "mock";

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const started = Date.now();
    const system = req.messages.find((m) => m.role === "system")?.content ?? "";
    const user = req.messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");

    const role = detectRole(system);

    const text = this.buildText(role, user);
    const usage = {
      promptTokens: estimateTokens(system + user),
      completionTokens: estimateTokens(text),
    };

    // simulate latency proportional to output size
    await new Promise((r) => setTimeout(r, 40 + Math.min(400, usage.completionTokens * 0.6)));

    return {
      text,
      usage,
      latencyMs: Date.now() - started,
    };
  }

  private buildText(role: string, question: string): string {
    const q = cleanQuestion(question);
    if (role === "synthesis") return this.buildSynthesis(question);
    if (role === "orchestrator") return this.buildConsolidation(q);
    if (role === "consensus") return this.buildConsensus(q);
    return this.buildAnalysis(q);
  }

  private buildAnalysis(q: string): string {
    const hasNumbers = /\d/.test(q);
    const hasConjunction = /\b(mais|cependant|par contre|pourtant)\b/i.test(q);
    const hasUncertainty = /\b(peut-être|probablement|pourrait|sans doute)\b/i.test(q);

    const bullet = (s: string) => `- ${s}`;
    const lines: string[] = [
      `Point de vue principal : réponse structurée en ${hasNumbers ? "trois " : "deux "}parties, avec évaluation des enjeux.`,
    ];
    lines.push(bullet(`Argument clé : distinguer les faits vérifiables des interprétations, et mentionner le contexte pertinent.`));
    if (hasConjunction) {
      lines.push(bullet(`Nuance importante : la question contient une opposition ; il faut pondérer les deux faces.`));
    } else {
      lines.push(bullet(`Élément de convergence probable : les analystes devraient s'accorder sur les points factuels centraux.`));
    }
    if (hasUncertainty) {
      lines.push(bullet(`Hypothèse : en l'absence d'information complète, certaines conclusions restent conditionnelles (marqueur de prudence).`));
    } else {
      lines.push(bullet(`Conclusion provisoire : une position claire est recommandée, avec réserves explicites si besoin.`));
    }
    lines.push(bullet(`Prochaines étapes suggérées : vérifier les sources, comparer les interprétations, puis rédiger une synthèse nuancée.`));
    return lines.join("\n");
  }

  private buildConsolidation(q: string): string {
    return [
      `Synthèse consolidée de l'analyse de la question : ${q}`,
      "",
      "- Faits communs : les données factuelles centrales convergent entre les analyses.",
      "- Interprétations divergentes : les critères de priorité diffèrent selon les analystes.",
      "- Position consolidée : recommander un test contrôlé avant tout déploiement à grande échelle.",
      "- Réserves : certaines conclusions restent conditionnelles faute de données complètes.",
    ].join("\n");
  }

  private buildConsensus(q: string): string {
    return [
      `Point de consensus sur la question : ${q}`,
      "",
      "- Accord : les données factuelles centrales sont partagées par l'ensemble des analyses.",
      "- Désaccord qui change la conclusion : l'importance relative des critères de décision diffère.",
      "- Conclusion : un test contrôlé est nécessaire avant de choisir une option à grande échelle.",
    ].join("\n");
  }

  private buildSynthesis(questionInput: string): string {
    const q = cleanQuestion(questionInput);
    const title = q ? `En réponse à « ${q} »` : "En réponse à la question posée";
    return [
      "## Recommandation",
      "",
      `${title}, la stratégie la plus fiable est celle qui offre le meilleur équilibre entre coût maîtrisé, capacité de mesure et prévisibilité des résultats.`,
      "",
      "## Résumé",
      "",
      "- Plusieurs analystes convergent sur les points factuels centraux.",
      "- Les divergences portent sur l'importance relative des critères de décision.",
      "- Un test contrôlé est préférable à un déploiement immédiat à grande échelle.",
      "",
      "## Points d'accord",
      "",
      "- Les faits vérifiables doivent primer sur les interprétations.",
      "- La qualité du ciblage est déterminante pour le résultat.",
      "- Les données disponibles doivent être confirmées par une période de test identique.",
      "",
      "## Points de désaccord",
      "",
      "- L'importance relative des critères de décision varie selon les analystes.",
      "- Les données disponibles ne permettent pas de départager totalement les performances à long terme.",
      "",
      "## Limites",
      "",
      "Cette recommandation repose sur des hypothèses générales. Il faudrait comparer les coûts d'acquisition, les taux de conversion et la qualité des résultats sur une période de test identique.",
      "",
      "## Prochaine étape",
      "",
      "Lancer un test contrôlé de deux semaines avec un budget équivalent pour chaque option, puis comparer les résultats mesurables.",
    ].join("\n");
  }
}
