export function sanitizeFinalResponse(content: string): string {
  let out = content;
  const prefixes = [
    /^R[ée]ponse de r[oô]le[^.\n]*[.:]?\s*/i,
    /^Contexte re[çc]u[^.\n]*[.:]?\s*/i,
  ];
  for (const re of prefixes) {
    out = out.replace(re, "").trim();
  }
  return out;
}