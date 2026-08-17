"use client";

import { CloseIcon } from "./icons";

export type ToastTone = "success" | "error" | "info";

const TONES: Record<ToastTone, string> = {
  success: "border-success/30 bg-success-soft text-success",
  error: "border-danger/30 bg-danger-soft text-danger",
  info: "border-border bg-surface text-ink",
};

export function Toast({
  message,
  tone = "info",
  onClose,
}: {
  message: string;
  tone?: ToastTone;
  onClose: () => void;
}) {
  return (
    <div
      role="status"
      className={`flex items-center gap-3 rounded-lg border px-4 py-2.5 text-sm shadow-md ${TONES[tone]}`}
    >
      <span className="flex-1">{message}</span>
      <button
        onClick={onClose}
        aria-label="Fermer la notification"
        className="shrink-0 rounded p-0.5 opacity-70 transition-opacity hover:opacity-100"
      >
        <CloseIcon size={14} />
      </button>
    </div>
  );
}