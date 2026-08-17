import type { GenerationResult, GenerationRequest } from "@/contracts/gateway";

const WORDS_PER_TOKEN = 0.75;

function estimateTokens(text: string): number {
  return Math.max(1, Math.round(text.split(/\s+/).filter(Boolean).length / WORDS_PER_TOKEN));
}

const ROLES: Record<string, string> = {
  analyst: "Analyste indépendant",
  synthesis: "Arbitre final",
  orchestrator: "Orchestrateur",
};

export class MockAdapter {
  readonly provider = "mock";

  async generate(req: GenerationRequest): Promise<GenerationResult> {
    const started = Date.now();
    const system = req.messages.find((m) => m.role === "system")?.content ?? "";
    const user = req.messages.filter((m) => m.role === "user").map((m) => m.content).join("\n");

    const role = ROLES[system.includes("ANALYST") ? "analyst" : system.includes("CONSENSUS") ? "consensus" : system.includes("SYNTHESIS") ? "synthesis" : system.includes("ORCHESTRATOR") ? "orchestrator" : "analyst"];
    const isAnalysis = system.includes("ANALYST") || system.includes("TARGETED");

    const text = this.buildText(role, user, req.spec.model, isAnalysis);
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

  private buildText(role: string, question: string, model: string, isAnalysis: boolean): string {
    const q = question.slice(0, 120).replace(/\s+/g, " ").trim();
    if (!isAnalysis) {
      return `[mock:${model}] Réponse de rôle ${role.toLowerCase()} pour « ${q} ».\n\nContexte reçu, ${role.toLowerCase() === "orchestrateur" ? "analyse en cours de consolidation." : "synthèse prête."}`;
    }

    const hasNumbers = /\d/.test(q);
    const hasConjunction = /\b(mais|cependant|par contre|pourtant)\b/i.test(q);
    const hasUncertainty = /\b(peut-être|probablement|pourrait|sans doute)\b/i.test(q);

    const bullet = (s: string) => `- ${s}`;
    const lines: string[] = [
      `Analyse indépendante (modèle ${model}, rôle ${role.toLowerCase()}) de la question : ${q}.`,
    ];
    lines.push(bullet(`Point de vue principal : réponse structurée en ${hasNumbers ? "trois " : "deux "}parties, avec évaluation des enjeux.`));
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
}