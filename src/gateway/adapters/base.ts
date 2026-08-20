import type { ChatMessage, Usage } from "@/contracts/gateway";
import { ProviderError } from "@/gateway/errors";

export interface HttpProviderRequest {
  url: string;
  headers: Record<string, string>;
  body: unknown;
  apiKey?: string;
  timeoutMs?: number;
  signal?: AbortSignal;
  retries?: number;
}

class HttpStatusError {
  constructor(
    readonly status: number,
    readonly body: string
  ) {}
}

function toProviderError(err: unknown): ProviderError {
  if (err instanceof HttpStatusError) {
    const body = err.body.slice(0, 300);
    const status = err.status;
    if (status === 401 || status === 403) {
      return new ProviderError("invalid_key", `provider_http_${status}: ${body}`, { status });
    }
    if (status === 429) {
      return new ProviderError("rate_limit", `provider_http_429: ${body}`, { status });
    }
    if (status === 408) {
      return new ProviderError("timeout", `provider_http_408: ${body}`, { status });
    }
    if (status === 413 || (status === 400 && /(maximum context length|context length|token limit|too many tokens|input is too long|request too large)/i.test(body))) {
      return new ProviderError("context_length", `provider_context_length: ${body}`, { status });
    }
    if (status >= 500) {
      return new ProviderError("server", `provider_http_${status}: ${body}`, { status });
    }
    return new ProviderError("http", `provider_http_${status}: ${body}`, { status });
  }
  if (err instanceof ProviderError) return err;
  const detail = err instanceof Error ? err.message : String(err);
  return new ProviderError("http", `provider_error: ${detail}`);
}

async function doFetch(
  url: string,
  headers: Record<string, string>,
  body: unknown,
  timeoutMs: number,
  outerSignal?: AbortSignal
): Promise<Response> {
  const controller = new AbortController();
  let timedOut = false;
  const timer = setTimeout(() => {
    timedOut = true;
    controller.abort();
  }, timeoutMs);
  const onOuterAbort = () => controller.abort();
  outerSignal?.addEventListener("abort", onOuterAbort, { once: true });

  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...headers,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new HttpStatusError(res.status, text);
    }
    return res;
  } catch (err) {
    if (err instanceof HttpStatusError) throw err;
    const aborted = (err as { name?: string } | null)?.name === "AbortError";
    if (aborted) {
      if (timedOut) throw new ProviderError("timeout", "provider_timeout");
      throw new ProviderError("aborted", "provider_aborted");
    }
    const detail = err instanceof Error ? err.message : String(err);
    throw new ProviderError("network", `provider_network_error: ${detail}`);
  } finally {
    clearTimeout(timer);
    outerSignal?.removeEventListener("abort", onOuterAbort);
  }
}

async function readJson<T>(res: Response): Promise<T> {
  try {
    return (await res.json()) as T;
  } catch {
    const body = await res.text().catch(() => "");
    throw new ProviderError("http", `provider_invalid_json: ${body.slice(0, 300)}`);
  }
}

export function backoffMs(attempt: number, rateLimit = false): number {
  const base = rateLimit ? 400 : 150;
  return Math.min(2000, base * 2 ** (attempt - 1) + Math.random() * 100);
}

export async function httpJson<T>(req: HttpProviderRequest): Promise<T> {
  const { signal, timeoutMs = 120_000, retries = 2, ...rest } = req;
  let attempt = 0;
  for (;;) {
    let res: Response;
    try {
      res = await doFetch(rest.url, rest.headers, rest.body, timeoutMs, signal);
    } catch (err) {
      const providerErr = toProviderError(err);
      if (!(providerErr.retryable && attempt < retries && !signal?.aborted)) throw providerErr;
      attempt += 1;
      await new Promise((resolve) => setTimeout(resolve, backoffMs(attempt, providerErr.type === "rate_limit")));
      continue;
    }
    return readJson<T>(res);
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

export function assertText(text: string | undefined | null): string {
  const trimmed = (text ?? "").trim();
  if (!trimmed) throw new ProviderError("empty_response", "provider_empty_response");
  return trimmed;
}