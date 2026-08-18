export interface ModelOption {
  label: string;
  slug: string;
}

export const MODELS_BY_PROVIDER: Record<string, ModelOption[]> = {
  openai: [{ label: "ChatGPT 5.6", slug: "chatgpt-5.6" }],
  gemini: [{ label: "Gemini 3.7 Flash", slug: "gemini-3.7-flash" }],
  anthropic: [{ label: "Claude Opus 5", slug: "claude-opus-5" }],
  deepseek: [{ label: "DeepSeek V4", slug: "deepseek-v4" }],
  qwen: [{ label: "Qwen 3.8 Max", slug: "qwen-3.8-max" }],
  kimi: [{ label: "Kimi K3", slug: "kimi-k3" }],
  glm: [{ label: "GLM 5.3", slug: "glm-5.3" }],
  xai: [{ label: "Grok 4.6", slug: "grok-4.6" }],
  meta: [{ label: "Muse Spark", slug: "muse-spark-1.2" }],
  openrouter: [{ label: "Auto (OpenRouter)", slug: "auto" }],
  mock: [{ label: "Mock (démo)", slug: "mock" }],
};

export interface ProviderPlatform {
  url: string;
  hint: string;
}

export const PROVIDER_PLATFORMS: Record<string, ProviderPlatform> = {
  openai: {
    url: "https://platform.openai.com/api-keys",
    hint: "Créez ou connectez-vous à votre compte OpenAI, puis générez une clé API dans le tableau de bord.",
  },
  anthropic: {
    url: "https://console.anthropic.com/",
    hint: "Créez ou connectez-vous à votre compte Anthropic, puis générez une clé API depuis la console.",
  },
  gemini: {
    url: "https://aistudio.google.com/apikey",
    hint: "Créez ou connectez-vous à votre compte Google, puis générez une clé API Gemini depuis Google AI Studio.",
  },
  deepseek: {
    url: "https://platform.deepseek.com/",
    hint: "Créez ou connectez-vous à votre compte DeepSeek, puis générez une clé API depuis la plateforme.",
  },
  qwen: {
    url: "https://dashscope.console.aliyun.com/apiKey",
    hint: "Créez ou connectez-vous à votre compte Alibaba Cloud, puis générez une clé API depuis le portail DashScope.",
  },
  kimi: {
    url: "https://platform.moonshot.ai/",
    hint: "Créez ou connectez-vous à votre compte Moonshot, puis générez une clé API depuis la plateforme.",
  },
  glm: {
    url: "https://open.bigmodel.cn/",
    hint: "Créez ou connectez-vous à votre compte Zhipu AI, puis générez une clé API depuis la console BigModel.",
  },
  xai: {
    url: "https://console.x.ai/",
    hint: "Créez ou connectez-vous à votre compte xAI, puis générez une clé API depuis la console.",
  },
  meta: {
    url: "https://www.llama.com/",
    hint: "Créez ou connectez-vous à votre compte Meta, puis générez une clé API depuis la plateforme Meta Model API.",
  },
  openrouter: {
    url: "https://openrouter.ai/keys",
    hint: "Créez ou connectez-vous à votre compte OpenRouter, puis générez une clé API depuis le tableau de bord.",
  },
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
  meta: "Meta Model API",
  openrouter: "OpenRouter",
  mock: "Mock (démo)",
};

export const OPENAI_COMPATIBLE_BASE_URLS: Record<string, string> = {
  openai: "https://api.openai.com/v1",
  deepseek: "https://api.deepseek.com/v1",
  qwen: "https://dashscope.aliyuncs.com/compatible-mode/v1",
  kimi: "https://api.moonshot.ai/v1",
  glm: "https://open.bigmodel.cn/api/paas/v4",
  xai: "https://api.x.ai/v1",
  meta: "https://api.meta.ai/v1",
};