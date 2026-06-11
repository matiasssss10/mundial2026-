// lib/model/derived.ts
// Mercados derivados: tarjetas, córners, goleadores

import { pmf } from "./poisson";

// ─── Tarjetas ────────────────────────────────────────────────────
export interface CardsPred {
  avgHome: number; avgAway: number; avgTotal: number;
  probO35: number; probRed: number;
  confidence: "low";
}

export function predictCards(p: {
  avgHome: number; avgAway: number;
  eloDiff: number; isKnockout?: boolean;
}): CardsPred {
  const intensity = 1 + Math.max(0, (250 - p.eloDiff) / 500) * 0.3;
  const kf = p.isKnockout ? 1.15 : 1;
  const h = p.avgHome * intensity * kf;
  const a = p.avgAway * intensity * kf;
  const total = h + a;
  let u35 = 0;
  for (let k = 0; k <= 3; k++) u35 += pmf(total, k);
  return {
    avgHome: +h.toFixed(2), avgAway: +a.toFixed(2), avgTotal: +total.toFixed(2),
    probO35: +Math.min(0.93, 1 - u35).toFixed(3),
    probRed: +Math.min(0.40, 0.07 * intensity * kf).toFixed(3),
    confidence: "low",
  };
}

// ─── Córners ─────────────────────────────────────────────────────
export interface CornersPred {
  avgHome: number; avgAway: number; avgTotal: number;
  line: number; probOver: number; probUnder: number;
  confidence: "medium";
}

export function predictCorners(p: {
  avgHome: number; avgAway: number; eloDiff: number;
}): CornersPred {
  const h = p.avgHome * (1 + (250 - Math.min(p.eloDiff, 500)) / 2500 * 0.1);
  const a = p.avgAway * (1 + (250 - Math.min(p.eloDiff, 500)) / 2500 * 0.1);
  const total = h + a;
  const line = Math.round(total * 2) / 2; // nearest 0.5
  let u = 0;
  for (let k = 0; k <= Math.floor(line); k++) u += pmf(total, k);
  return {
    avgHome: +h.toFixed(2), avgAway: +a.toFixed(2), avgTotal: +total.toFixed(2),
    line, probOver: +Math.min(0.88, 1 - u).toFixed(3),
    probUnder: +Math.max(0.12, u).toFixed(3),
    confidence: "medium",
  };
}

// ─── Goleadores ──────────────────────────────────────────────────
export interface ScorerOdds {
  id: number; name: string; position: string;
  probScore: number; probFirst: number; xg: number;
}

export function predictScorers(p: {
  teamLambda: number;
  players: Array<{ id: number; name: string; position: string; goals_p90: number; minutes: number }>;
}): ScorerOdds[] {
  const pool = p.players.filter(pl => pl.position === "FWD" || pl.position === "MID");
  const totalW = pool.reduce((s, pl) => s + Math.max(0, pl.goals_p90), 0);
  if (totalW === 0) return [];
  return pool.map(pl => {
    const share = Math.max(0, pl.goals_p90) / (totalW || 1);
    const lam = p.teamLambda * share;
    const posFactor = pl.position === "FWD" ? 1.2 : 0.85;
    return {
      id: pl.id, name: pl.name, position: pl.position,
      probScore: +Math.min(0.97, 1 - Math.exp(-lam)).toFixed(3),
      probFirst: +Math.min(0.42, share * (1 - Math.exp(-p.teamLambda)) * posFactor).toFixed(3),
      xg: +lam.toFixed(3),
    };
  }).sort((a, b) => b.probScore - a.probScore).slice(0, 8);
}
