"use client";

import { Anthropic, DeepSeek, Gemini, Grok, Kimi, Meta, Moonshot, OpenAI, Spark, ZenMux, Zhipu } from "@lobehub/icons";
import type { ComponentType } from "react";
import type { ModelSpec } from "@/contracts/gateway";

type Brand = "openai" | "gemini" | "deepseek" | "grok" | "anthropic" | "kimi" | "meta" | "moonshot" | "spark" | "zhipu" | "zenmux";

type BrandIcon = ComponentType<{ size?: number | string; color?: string; title?: string }>;

const BRANDS: Record<Brand, { icon: BrandIcon; color: string }> = {
  openai: { icon: OpenAI, color: "#000000" },
  gemini: { icon: Gemini, color: "#4285f4" },
  deepseek: { icon: DeepSeek, color: "#4d6bfe" },
  grok: { icon: Grok, color: "#000000" },
  anthropic: { icon: Anthropic, color: "#d97757" },
  kimi: { icon: Kimi, color: "#000000" },
  meta: { icon: Meta, color: "#1d65c1" },
  moonshot: { icon: Moonshot, color: "#16191e" },
  spark: { icon: Spark, color: "#0070f0" },
  zhipu: { icon: Zhipu, color: "#3859ff" },
  zenmux: { icon: ZenMux, color: "#000000" },
};

export function brandFor(spec?: ModelSpec | null): Brand | null {
  if (!spec) return null;
  const provider = spec.provider.toLowerCase();
  const model = spec.model.toLowerCase();
  if (/chatgpt|gpt[-.\d]|\bo\d|\bo3/.test(model)) return "openai";
  if (/gemini/.test(model)) return "gemini";
  if (/deepseek/.test(model)) return "deepseek";
  if (/grok/.test(model)) return "grok";
  if (/claude/.test(model)) return "anthropic";
  if (/kimi/.test(model)) return "kimi";
  if (/muse/.test(model)) return "meta";
  if (/spark/.test(model)) return "spark";
  if (/glm|zhipu/.test(model)) return "zhipu";
  switch (provider) {
    case "openai":
      return "openai";
    case "gemini":
    case "google":
      return "gemini";
    case "deepseek":
      return "deepseek";
    case "anthropic":
      return "anthropic";
    case "xai":
      return "grok";
    case "kimi":
    case "moonshot":
      return "kimi";
    case "meta":
      return "meta";
    case "zenmux":
      return "zenmux";
    default:
      return null;
  }
}

export function ModelLogo({
  spec,
  size = 16,
  title,
}: {
  spec?: ModelSpec | null;
  size?: number;
  title?: boolean;
}) {
  const brand = brandFor(spec);
  if (!brand) return null;
  const { icon: Icon, color } = BRANDS[brand];
  return (
    <span className="inline-flex shrink-0 items-center" title={title ? `${spec?.provider}/${spec?.model}` : undefined}>
      <Icon size={size} color={color} />
    </span>
  );
}