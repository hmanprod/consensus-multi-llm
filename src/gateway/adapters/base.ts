import type { ChatMessage, Usage } from "@/contracts/gateway";

export interface HttpProviderRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  apiKey?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
}

export async function httpJson<T>(req: HttpProviderRequest): Promise<T> {
  const { signal, timeoutMs = 120_000, ...rest } = req;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const onOuterAbort = () => controller.abort();
  signal?.addEventListener("abort", onOuterAbort, { once: true });

  try {
    const res = await fetch(rest.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...rest.headers,
      },
      body: JSON.stringify(rest.body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`provider_http_${res.status}: ${body.slice(0, 300)}`);
    }
    return (await res.json()) as T;
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", onOuterAbort);
  }
}

export function time<T>(fn: () => Promise<T>): Promise<{ value: T; latencyMs: number }> {
  const started = Date.now();
  return fn().then((value) => ({ value, latencyMs: Date.now() - started }));
}

export function toUsage(promptTokens: number | undefined, completionTokens: number | undefined): Usage {
  return {
    promptTokens: promptTokens ?? 0,
    completionTokens: completionTokens ?? 0,
  };
}

export function lastUserMessage(messages: ChatMessage[]): string {
  return [...messages].reverse().find((m) => m.role === "user")?.content ?? "";
}