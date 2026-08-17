"use client";

import { useState } from "react";
import { MarkdownRenderer } from "./MarkdownRenderer";
import { Button } from "./ui/Button";
import { Badge } from "./ui/Badge";
import { AlertIcon, CheckIcon, CopyIcon, PanelIcon, RefreshIcon, SparklesIcon } from "./ui/icons";

export function ConsensusSummaryCard({
  content,
  onCopy,
  onOpenOutput,
  onRegenerate,
  onDeepen,
}: {
  content: string;
  onCopy: () => void;
  onOpenOutput: () => void;
  onRegenerate: () => void;
  onDeepen: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const isError = content.startsWith("Une erreur est survenue");

  async function copy() {
    await onCopy();
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  if (isError) {
    return (
      <div className="rounded-xl border border-danger/30 bg-danger-soft p-4">
        <div className="flex items-center gap-2">
          <AlertIcon size={16} className="text-danger" />
          <p className="text-sm font-medium text-danger">L&apos;analyse n&apos;a pas abouti</p>
        </div>
        <p className="mt-2 text-sm text-danger">{content}</p>
      </div>
    );
  }

  return (
    <article className="rounded-xl border border-border bg-bg p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm font-semibold text-ink">Réponse finale</span>
          <Badge tone="accent">Consensus</Badge>
        </div>
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={copy} aria-label="Copier la réponse">
            {copied ? <CheckIcon size={14} className="text-success" /> : <CopyIcon size={14} />}
            {copied ? "Copié" : "Copier"}
          </Button>
          <Button size="sm" variant="ghost" onClick={onDeepen}>
            <SparklesIcon size={14} />
            Approfondir
          </Button>
          <Button size="sm" variant="ghost" onClick={onRegenerate}>
            <RefreshIcon size={14} />
            Relancer
          </Button>
          <Button size="sm" variant="secondary" onClick={onOpenOutput}>
            <PanelIcon size={14} />
            Voir le consensus
          </Button>
        </div>
      </div>

      <div className="mt-4">
        <MarkdownRenderer content={content} />
      </div>
    </article>
  );
}