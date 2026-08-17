import type { ConsensusReport } from "@/contracts/workflow";

interface Items {
  bullets: string[];
  paragraphs: string[];
}

function detectSection(title: string): keyof ConsensusReport | null {
  const t = title.toLowerCase().replace(/[’']/g, "'").trim();
  if (t.startsWith("recommandation")) return "recommendation";
  if (t.startsWith("résumé") || t.startsWith("resume") || t === "summary") return "summary";
  if (t.startsWith("points d'accord") || t.startsWith("agreement")) return "agreements";
  if (t.startsWith("points de désaccord") || t.startsWith("points de desaccord") || t.startsWith("disagreement")) return "disagreements";
  if (t.startsWith("limite")) return "limitations";
  if (t.startsWith("prochaine étape") || t.startsWith("prochaine etape") || t.startsWith("next step")) return "nextSteps";
  return null;
}

function extractItems(lines: string[]): Items {
  const bullets: string[] = [];
  const paragraphs: string[] = [];
  let para: string[] = [];
  for (const line of lines) {
    const b = /^(?:[-*+]\s+|\d+\.\s+)(.*)$/.exec(line);
    if (b) {
      if (para.length) {
        paragraphs.push(para.join(" "));
        para = [];
      }
      bullets.push(b[1]);
    } else {
      para.push(line);
    }
  }
  if (para.length) paragraphs.push(para.join(" "));
  return { bullets, paragraphs };
}

function inferConfidence(recommendation: string, limitations: string[]): "low" | "medium" | "high" {
  const text = `${recommendation} ${limitations.join(" ")}`.toLowerCase();
  if (/\b(incertain|incertitude|conditionnel|probablement|ne permet pas|départager|doute|réserves|prudent)\b/.test(text)) {
    return "low";
  }
  if (/\b(fiable|robuste|clairement|sans ambiguïté|forte|élevé|évident)\b/.test(text)) {
    return "high";
  }
  return "medium";
}

export function parseConsensusReport(markdown: string): ConsensusReport | null {
  const lines = markdown.replace(/\r\n/g, "\n").split("\n");
  const sections: { key: keyof ConsensusReport; lines: string[] }[] = [];
  let current: { key: keyof ConsensusReport; lines: string[] } | null = null;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;
    const m = /^#{1,4}\s+(.*)$/.exec(line);
    if (m) {
      const key = detectSection(m[1]);
      if (key) {
        current = { key, lines: [] };
        sections.push(current);
      } else {
        current = null;
      }
      continue;
    }
    if (current && !line.startsWith("```")) current.lines.push(line);
  }

  if (sections.length === 0) return null;

  const report: ConsensusReport = {
    recommendation: "",
    summary: [],
    agreements: [],
    disagreements: [],
    limitations: [],
    nextSteps: [],
  };

  for (const section of sections) {
    const items = extractItems(section.lines);
    switch (section.key) {
      case "recommendation":
        report.recommendation = items.paragraphs.join(" ") || items.bullets.join(" ");
        break;
      case "limitations":
        report.limitations = [...items.bullets, ...items.paragraphs];
        break;
      case "nextSteps":
        report.nextSteps = [...items.bullets, ...items.paragraphs];
        break;
      case "summary":
      case "agreements":
      case "disagreements":
        report[section.key] = items.bullets.length > 0 ? items.bullets : items.paragraphs;
        break;
    }
  }

  report.confidence = inferConfidence(report.recommendation, report.limitations);
  return report;
}
