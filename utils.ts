// lib/utils.ts
export const RATE = 4200; // COP por USD

export function cop(usd: number): string {
  return "$" + (Math.round(usd * RATE / 500) * 500).toLocaleString("es-CO");
}
export function pct(p: number | null | undefined, d = 1): string {
  if (p == null) return "—";
  return (p * 100).toFixed(d) + "%";
}
export function toOdds(p: number): string {
  if (!p || p <= 0) return "—";
  return (1 / p).toFixed(2) + "×";
}
export function fairOdds(p: number, margin = 1.08): string {
  if (!p || p <= 0) return "—";
  return (1 / p * margin).toFixed(2) + "×";
}
export function edgeVal(prob: number, bookOdds: number): number {
  return prob - 1 / bookOdds;
}
export function evVal(prob: number, bookOdds: number): number {
  return prob * (bookOdds - 1) - (1 - prob);
}
export function kellyStake(prob: number, bookOdds: number, bankroll: number): number {
  const b = bookOdds - 1;
  const k = (b * prob - (1 - prob)) / b;
  return Math.max(0, Math.min(k * 0.25, 0.08)) * bankroll;
}
export function confInfo(c: number): { label: string; color: string } {
  return c >= 0.75
    ? { label: "Alta",  color: "#00c896" }
    : c >= 0.55
    ? { label: "Media", color: "#e9a100" }
    : { label: "Baja",  color: "#f04060" };
}
export function clip(v: number, lo = 0.01, hi = 0.99) {
  return Math.min(hi, Math.max(lo, v));
}
