export function formatPct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

export function formatSignedPct(value: number): string {
  const pct = (value * 100).toFixed(1);
  return `${value >= 0 ? "+" : ""}${pct}%`;
}

export function formatBb(value: number): string {
  return `${value.toFixed(2)} bb`;
}

export function nowIso(): string {
  return new Date().toISOString();
}
