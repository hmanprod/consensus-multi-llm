export type ProviderErrorType =
  | "invalid_key"
  | "rate_limit"
  | "timeout"
  | "server"
  | "network"
  | "http"
  | "empty_response"
  | "refused"
  | "aborted"
  | "context_length";

const RETRYABLE_TYPES = new Set<ProviderErrorType>(["rate_limit", "timeout", "server", "network"]);

export class ProviderError extends Error {
  readonly type: ProviderErrorType;
  readonly status?: number;
  readonly retryable: boolean;

  constructor(type: ProviderErrorType, message: string, opts?: { status?: number; retryable?: boolean; cause?: unknown }) {
    super(message, { cause: opts?.cause });
    this.name = "ProviderError";
    this.type = type;
    this.status = opts?.status;
    this.retryable = opts?.retryable ?? RETRYABLE_TYPES.has(type);
  }
}

export function isProviderError(err: unknown): err is ProviderError {
  return err instanceof ProviderError;
}

const FRIENDLY: Record<ProviderErrorType, (status?: number) => string> = {
  invalid_key: (s) => `Clé API invalide ou refusée par le fournisseur${s ? ` (HTTP ${s})` : ""}.`,
  rate_limit: (s) =>
    `Le fournisseur limite la cadence des requêtes${s ? ` (HTTP ${s})` : ""}. Réessayez dans quelques instants.`,
  timeout: () => "Délai dépassé : le fournisseur n'a pas répondu à temps.",
  server: (s) => `Le fournisseur rencontre une erreur serveur${s ? ` (HTTP ${s})` : ""}. Réessayez ultérieurement.`,
  network: () => "Problème de connexion avec le fournisseur.",
  http: (s) => `Erreur du fournisseur${s ? ` (HTTP ${s})` : ""}.`,
  empty_response: () => "Le fournisseur a renvoyé une réponse vide.",
  refused: () => "Le fournisseur a refusé la génération de la réponse.",
  aborted: () => "Analyse annulée.",
  context_length: () =>
    "Le fournisseur refuse : la question ou le contexte de l'étape dépasse sa fenêtre de contexte. Raccourcissez le message ou découpez-le en plusieurs questions.",
};

export function friendlyMessage(err: unknown): string {
  if (err instanceof ProviderError) return FRIENDLY[err.type](err.status);
  if (err instanceof Error) return err.message;
  return String(err);
}