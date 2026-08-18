export interface ModelOption {
  label: string;
  slug: string;
}

export const MODELS_BY_PROVIDER: Record<string, ModelOption[]> = {
  openai: [{ label: "ChatGPT 5.6", slug: "chatgpt-5.6" }],
  gemini: [{ label: "Gemini 3.5 Flash", slug: "gemini-3.5-flash" }],
  anthropic: [{ label: "Claude Opus 5", slug: "claude-opus-5" }],
  deepseek: [{ label: "DeepSeek V4", slug: "deepseek-v4" }],
  qwen: [{ label: "Qwen 3.8 Max", slug: "qwen-3.8-max" }],
  kimi: [{ label: "Kimi K3", slug: "kimi-k3" }],
  glm: [{ label: "GLM 5.3", slug: "glm-5.3" }],
  xai: [{ label: "Grok 4.6", slug: "grok-4.6" }],
  openrouter: [{ label: "Auto (OpenRouter)", slug: "auto" }],
  mock: [{ label: "Mock (démo)", slug: "mock" }],
};

export const PROVIDER_LABELS: Record<string, string> = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  gemini: "Google Gemini",
  deepseek: "DeepSeek",
  qwen: "Qwen (Alibaba)",
  kimi: "Kimi (Moonshot)",
  glm: "GLM (Zhipu)",
  xai: "Grok (xAI)",
  openrouter: "OpenRouter",
  mock: "Mock (démo)",
};

export const OPENAI_COMPATIBLE_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  kimi: "https://api.moonshot.cn/v1",
  glm: "https://open.bigmodel.cn/api/paas/v4",
  xai: "https://api.x.ai/v1",
};