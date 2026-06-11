// lib/model/poisson.ts
// Motor de predicción — distribución de Poisson + ELO + forma

export function pmf(lambda: number, k: number): number {
  if (lambda <= 0) return k === 0 ? 1 : 0;
  let p = Math.exp(-lambda);
  for (let i = 1; i <= k; i++) p = (p * lambda) / i;
  return Math.max(0, p);
}

// Matriz de marcadores exactos (hasta maxG × maxG)
export function scoreMatrix(lH: number, lA: number, maxG = 9): number[][] {
  const m: number[][] = [];
  for (let h = 0; h <= maxG; h++) {
    m[h] = [];
    for (let a = 0; a <= maxG; a++) m[h][a] = pmf(lH, h) * pmf(lA, a);
  }
  return m;
}

// Ajuste ELO — retorna multiplicadores para lambda (0.88–1.12)
export function eloMuls(eloH: number, eloA: number): [number, number] {
  const diff = eloH - eloA;
  const wH = 1 / (1 + Math.pow(10, -diff / 400));
  return [0.88 + wH * 0.24, 0.88 + (1 - wH) * 0.24];
}

// Forma ("WWDLW") → multiplicador 0.92–1.08
export function formMul(form: string): number {
  if (!form) return 1;
  const pts = form.split("").reduce((s, c) => s + (c === "W" ? 1 : c === "D" ? 0.5 : 0), 0);
  return 0.92 + (pts / form.length) * 0.16;
}

let globalMLFactorHome = 1.0;
let globalMLFactorAway = 1.0;

export function tuneModel(realHome: number, realAway: number, predHome: number, predAway: number) {
  const lr = 0.05; // Learning rate
  globalMLFactorHome -= lr * (predHome - realHome);
  globalMLFactorAway -= lr * (predAway - realAway);
  globalMLFactorHome = Math.max(0.8, Math.min(1.2, globalMLFactorHome));
  globalMLFactorAway = Math.max(0.8, Math.min(1.2, globalMLFactorAway));
}

export function lambda(params: {
  xgAtk: number; xgaDef: number;
  leagueAvg?: number; sede?: number;
  formMul?: number; eloMul?: number;
  isHome?: boolean;
}): number {
  const { xgAtk, xgaDef, leagueAvg = 1.35, sede = 0, formMul = 1, eloMul = 1, isHome = true } = params;
  const mlFactor = isHome ? globalMLFactorHome : globalMLFactorAway;
  const l = (xgAtk * xgaDef / leagueAvg) * (1 + sede) * formMul * eloMul * mlFactor;
  return Math.max(0.15, Math.min(5, l));
}

export interface Prediction {
  xgHome: number; xgAway: number;
  probHome: number; probDraw: number; probAway: number;
  prob1X: number; prob12: number; probX2: number;
  probO15: number; probU15: number;
  probO25: number; probU25: number;
  probO35: number; probU35: number;
  probBttsY: number; probBttsN: number;
  probCsH: number; probCsA: number;
  exactScores: Array<{ score: string; prob: number }>;
  confidence: number;
}

export function predict(
  home: { xgAvg: number; xgaAvg: number; elo: number; form: string; sede: number },
  away: { xgAvg: number; xgaAvg: number; elo: number; form: string; sede: number }
): Prediction {
  const [mulH, mulA] = eloMuls(home.elo, away.elo);
  const fH = formMul(home.form);
  const fA = formMul(away.form);

  const lH = lambda({ xgAtk: home.xgAvg, xgaDef: away.xgaAvg, sede: home.sede, formMul: fH, eloMul: mulH, isHome: true });
  const lA = lambda({ xgAtk: away.xgAvg, xgaDef: home.xgaAvg, sede: away.sede, formMul: fA, eloMul: mulA, isHome: false });

  const mat = scoreMatrix(lH, lA);

  let pH = 0, pD = 0, pA = 0;
  for (let h = 0; h <= 9; h++)
    for (let a = 0; a <= 9; a++) {
      const p = mat[h][a];
      if (h > a) pH += p; else if (h === a) pD += p; else pA += p;
    }
  const t = pH + pD + pA;
  pH /= t; pD /= t; pA /= t;

  const over = (line: number) => {
    let u = 0;
    for (let h = 0; h <= 9; h++)
      for (let a = 0; a <= 9; a++)
        if (h + a <= line) u += mat[h][a];
    return clip(1 - u);
  };

  const pBtts = (1 - pmf(lH, 0)) * (1 - pmf(lA, 0));

  const scores: Array<{ score: string; prob: number }> = [];
  for (let h = 0; h <= 5; h++)
    for (let a = 0; a <= 5; a++)
      scores.push({ score: `${h}-${a}`, prob: mat[h][a] });

  const conf = clip(0.52 + Math.min(Math.abs(home.elo - away.elo) / 500, 0.35));

  return {
    xgHome: +lH.toFixed(3), xgAway: +lA.toFixed(3),
    probHome: +pH.toFixed(4), probDraw: +pD.toFixed(4), probAway: +pA.toFixed(4),
    prob1X: +(pH + pD).toFixed(4), prob12: +(pH + pA).toFixed(4), probX2: +(pD + pA).toFixed(4),
    probO15: +over(1.5).toFixed(4), probU15: +(1 - over(1.5)).toFixed(4),
    probO25: +over(2.5).toFixed(4), probU25: +(1 - over(2.5)).toFixed(4),
    probO35: +over(3.5).toFixed(4), probU35: +(1 - over(3.5)).toFixed(4),
    probBttsY: +clip(pBtts).toFixed(4), probBttsN: +(1 - clip(pBtts)).toFixed(4),
    probCsH: +pmf(lA, 0).toFixed(4), probCsA: +pmf(lH, 0).toFixed(4),
    exactScores: scores.sort((a, b) => b.prob - a.prob).slice(0, 8)
      .map(s => ({ score: s.score, prob: +s.prob.toFixed(5) })),
    confidence: +conf.toFixed(3),
  };
}

function clip(v: number, lo = 0.01, hi = 0.99) {
  return Math.min(hi, Math.max(lo, v));
}
