// lib/model/montecarlo.ts
// Simulación Monte Carlo — 10.000 torneos completos

import { predict, pmf } from "./poisson";

export interface TeamSim {
  id: number; name: string; flag: string;
  xgAvg: number; xgaAvg: number;
  elo: number; form: string; sede: number;
}

export interface SimResult {
  teamId: number; name: string; flag: string;
  probChampion: number;
  probFinal: number;
  probSemi: number;
  probQF: number;
  probQualify: number;
  expectedGoals: number;
}

function samplePoisson(l: number): number {
  const L = Math.exp(-Math.max(0.01, l));
  let k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

function simMatch(h: TeamSim, a: TeamSim): [number, number] {
  const pred = predict(
    { xgAvg: h.xgAvg, xgaAvg: h.xgaAvg, elo: h.elo, form: h.form, sede: h.sede },
    { xgAvg: a.xgAvg, xgaAvg: a.xgaAvg, elo: a.elo, form: a.form, sede: a.sede }
  );
  return [samplePoisson(pred.xgHome), samplePoisson(pred.xgAway)];
}

function knockout(h: TeamSim, a: TeamSim): TeamSim {
  const [gh, ga] = simMatch(h, a);
  if (gh !== ga) return gh > ga ? h : a;
  // Penaltis: sesgo suave por ELO
  const pW = 0.4 + (h.elo - a.elo) / 2000;
  return Math.random() < Math.min(0.7, Math.max(0.3, pW)) ? h : a;
}

function simGroups(groups: Record<string, TeamSim[]>): TeamSim[] {
  const qualifiers: TeamSim[] = [];
  const thirdPlacers: Array<{ team: TeamSim; pts: number; gd: number; gf: number }> = [];

  for (const [, ts] of Object.entries(groups)) {
    const stats: Record<number, { pts: number; gd: number; gf: number }> = {};
    ts.forEach(t => { stats[t.id] = { pts: 0, gd: 0, gf: 0 }; });

    for (let i = 0; i < ts.length; i++) {
      for (let j = i + 1; j < ts.length; j++) {
        const [gh, ga] = simMatch(ts[i], ts[j]);
        stats[ts[i].id].gf += gh; stats[ts[i].id].gd += gh - ga;
        stats[ts[j].id].gf += ga; stats[ts[j].id].gd += ga - gh;
        if (gh > ga) stats[ts[i].id].pts += 3;
        else if (gh === ga) { stats[ts[i].id].pts += 1; stats[ts[j].id].pts += 1; }
        else stats[ts[j].id].pts += 3;
      }
    }

    const sorted = [...ts].sort((a, b) => {
      const sa = stats[a.id], sb = stats[b.id];
      return sb.pts !== sa.pts ? sb.pts - sa.pts
           : sb.gd !== sa.gd ? sb.gd - sa.gd
           : sb.gf - sa.gf;
    });

    qualifiers.push(sorted[0], sorted[1]);
    thirdPlacers.push({ team: sorted[2], ...stats[sorted[2].id] });
  }

  // 4 mejores terceros clasifican (32 = 12×2 + 8 wild)
  thirdPlacers.sort((a, b) => b.pts !== a.pts ? b.pts - a.pts : b.gd - a.gd);
  thirdPlacers.slice(0, 8).forEach(tp => qualifiers.push(tp.team));
  return qualifiers;
}

export function runMC(
  groups: Record<string, TeamSim[]>,
  N = 10000
): SimResult[] {
  const all = Object.values(groups).flat();
  const cnt: Record<number, { champion: number; final: number; semi: number; qf: number; qualify: number; goals: number }> = {};
  all.forEach(t => { cnt[t.id] = { champion: 0, final: 0, semi: 0, qf: 0, qualify: 0, goals: 0 }; });

  for (let s = 0; s < N; s++) {
    const Q = simGroups(groups);
    Q.forEach(t => { if (cnt[t.id]) cnt[t.id].qualify++; });

    // Shuffle bracket
    let bracket = [...Q].sort(() => Math.random() - 0.5).slice(0, 32);
    // Pad to 32 if needed
    while (bracket.length < 32) bracket.push(bracket[Math.floor(Math.random() * bracket.length)]);

    let round = bracket;
    while (round.length > 1) {
      const next: TeamSim[] = [];
      for (let i = 0; i < round.length; i += 2) {
        const w = knockout(round[i], round[i + 1]);
        next.push(w);
        if (round.length === 8) {
          if (cnt[round[i].id]) cnt[round[i].id].qf++;
          if (cnt[round[i+1].id]) cnt[round[i+1].id].qf++;
        }
        if (round.length === 4) {
          if (cnt[round[i].id]) cnt[round[i].id].semi++;
          if (cnt[round[i+1].id]) cnt[round[i+1].id].semi++;
        }
        if (round.length === 2) {
          if (cnt[round[i].id]) cnt[round[i].id].final++;
          if (cnt[round[i+1].id]) cnt[round[i+1].id].final++;
        }
      }
      round = next;
    }
    if (round[0] && cnt[round[0].id]) cnt[round[0].id].champion++;
  }

  return all.map(t => ({
    teamId: t.id, name: t.name, flag: t.flag,
    probChampion: +(cnt[t.id].champion / N).toFixed(4),
    probFinal:    +(cnt[t.id].final    / N).toFixed(4),
    probSemi:     +(cnt[t.id].semi     / N).toFixed(4),
    probQF:       +(cnt[t.id].qf       / N).toFixed(4),
    probQualify:  +(cnt[t.id].qualify  / N).toFixed(4),
    expectedGoals: +(t.xgAvg * 3.5).toFixed(2),
  })).sort((a, b) => b.probChampion - a.probChampion);
}
