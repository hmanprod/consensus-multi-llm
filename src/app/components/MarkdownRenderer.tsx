"use client";

import type { ReactNode } from "react";

const INLINE_RE = /(\*\*[^*\n]+\*\*|\*[^*\n]+\*|`[^`\n]+`|\[[^\]]+\]\([^)]+\))/g;
const LINK_RE = /^\[([^\]]+)\]\(([^)]+)\)$/;

function renderInline(text: string): ReactNode[] {
  const parts = text.split(INLINE_RE);
  return parts.map((part, i) => {
    if (!part) return null;
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={i} className="font-semibold text-ink">
          {renderInline(part.slice(2, -2))}
        </strong>
      );
    }
    if (part.startsWith("*") && part.endsWith("*")) {
      return <em key={i}>{renderInline(part.slice(1, -1))}</em>;
    }
    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={i}
          className="rounded bg-surface px-1.5 py-0.5 font-mono text-[13px] text-accent-strong"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    const link = LINK_RE.exec(part);
    if (link) {
      return (
        <a
          key={i}
          href={link[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-accent underline underline-offset-2 hover:text-accent-strong"
        >
          {link[1]}
        </a>
      );
    }
    return part;
  });
}

type ListType = "ul" | "ol";

function parseBlocks(content: string): ReactNode[] {
  const lines = content.replace(/\r\n/g, "\n").split("\n");
  const blocks: ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    if (/^\s*```/.test(line)) {
      const code: string[] = [];
      i += 1;
      while (i < lines.length && !/^\s*```/.test(lines[i])) {
        code.push(lines[i]);
        i += 1;
      }
      i += 1;
      blocks.push(
        <pre key={key++} className="overflow-x-auto rounded-lg bg-surface p-3 text-sm leading-relaxed text-ink">
          <code className="font-mono">{code.join("\n")}</code>
        </pre>
      );
      continue;
    }

    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      const text = heading[2];
      const sizes: Record<number, string> = {
        1: "text-lg font-semibold",
        2: "text-base font-semibold",
        3: "text-sm font-semibold",
        4: "text-sm font-medium",
      };
      const Tag = (`h${level}`) as "h1" | "h2" | "h3" | "h4";
      blocks.push(
        <Tag key={key++} className={`${sizes[level]} tracking-tight text-ink`}>
          {renderInline(text)}
        </Tag>
      );
      i += 1;
      continue;
    }

    if (/^\s*---\s*$/.test(line)) {
      blocks.push(<hr key={key++} className="border-border" />);
      i += 1;
      continue;
    }

    if (/^>\s?/.test(line)) {
      const quote: string[] = [];
      while (i < lines.length && /^>\s?/.test(lines[i])) {
        quote.push(lines[i].replace(/^>\s?/, ""));
        i += 1;
      }
      blocks.push(
        <blockquote key={key++} className="border-l-2 border-border-strong pl-3 text-ink-secondary">
          {quote.map((q, j) => (
            <p key={j} className="leading-relaxed">
              {renderInline(q)}
            </p>
          ))}
        </blockquote>
      );
      continue;
    }

    const listMatch = /^(?:(?:[-*+]\s+)|(\d+)\.\s+)(.*)$/.exec(line);
    if (listMatch) {
      const type: ListType = listMatch[1] ? "ol" : "ul";
      const items: string[] = [];
      while (i < lines.length) {
        const m = /^(?:(?:[-*+]\s+)|(\d+)\.\s+)(.*)$/.exec(lines[i]);
        if (!m || (m[1] ? "ol" : "ul") !== type) break;
        items.push(m[2]);
        i += 1;
      }
      const ListTag = type === "ul" ? "ul" : "ol";
      blocks.push(
        <ListTag key={key++} className={`list-outside space-y-1 pl-5 ${type === "ul" ? "list-disc" : "list-decimal"}`}>
          {items.map((item, j) => (
            <li key={j} className="leading-relaxed">
              {renderInline(item)}
            </li>
          ))}
        </ListTag>
      );
      continue;
    }

    if (line.trim() === "") {
      i += 1;
      continue;
    }

    const para: string[] = [];
    while (i < lines.length && lines[i].trim() !== "") {
      para.push(lines[i]);
      i += 1;
    }
    blocks.push(
      <p key={key++} className="leading-relaxed">
        {renderInline(para.join(" "))}
      </p>
    );
  }

  return blocks;
}

export function MarkdownRenderer({ content }: { content: string }) {
  return <div className="space-y-3">{parseBlocks(content)}</div>;
}