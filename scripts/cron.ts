// scripts/cron.ts
// Pipeline diario completo: ingesta → modelo → predicciones → Telegram
import "dotenv/config";
import { getDb } from "../lib/db/index";
import { predict } from "../lib/model/poisson";
import { predictCards, predictCorners } from "../lib/model/derived";
import { runMC } from "../lib/model/montecarlo";
import {
  testBot, sendScheduledPreviews, sendDailyCombis, sendDailySummary,
  type Combi,
} from "../lib/data/telegram";

const db = getDb();

async function main() {
  const start = Date.now();
  console.log(`\n══════════════════════════════════════`);
  console.log(`⚽  MUNDIAL 2026 — CRON ${new Date().toLocaleString("es-CO")}`);
  console.log(`══════════════════════════════════════\n`);

  // ── 0. Verificar Telegram ──────────────────────────────────────
  console.log("📱 Verificando bot Telegram...");
  const tg = await testBot();
  console.log(tg.ok ? `   ✅ @${tg.username}` : `   ⚠️  ${tg.error}`);

  // ── 1. Ingesta (si hay API key) ────────────────────────────────
  const hasAPI = !!process.env.RAPIDAPI_KEY && process.env.RAPIDAPI_KEY !== "pon_tu_key_aqui";
  if (hasAPI) {
    console.log("\n📥 Ingesta API-Football...");
    await ingestData();
  } else {
    console.log("\n📥 Sin API key — usando datos del seed");
  }

  // ── 2. Actualizar forma de equipos ─────────────────────────────
  console.log("\n📈 Actualizando forma...");
  updateForms();
  console.log("   ✅ Formas actualizadas");

  // ── 3. Calcular predicciones ───────────────────────────────────
  console.log("\n🧮 Calculando predicciones...");
  const nPred = calcPredictions();
  console.log(`   ✅ ${nPred} predicciones calculadas`);

  // ── 4. Monte Carlo ─────────────────────────────────────────────
  console.log("\n🎲 Monte Carlo (10.000 sims)...");
  calcMonteCarlo();
  console.log("   ✅ Proyecciones de torneo guardadas");

  // ── 5. Telegram — Resumen matutino ─────────────────────────────
  console.log("\n📱 Telegram: resumen matutino...");
  await sendMorningDigest();

  // ── 6. Telegram — Previas de partidos próximos ─────────────────
  console.log("\n📱 Telegram: previas de partidos...");
  const nPrev = await sendScheduledPreviews();
  console.log(`   ✅ ${nPrev} previas enviadas`);

  // ── 7. Telegram — Combinadas del día ───────────────────────────
  console.log("\n📱 Telegram: combinadas del día...");
  await dispatchDailyCombis();

  const elapsed = ((Date.now() - start) / 1000).toFixed(1);
  console.log(`\n✅ Pipeline completado en ${elapsed}s\n`);
}

// ── Ingesta ─────────────────────────────────────────────────────

async function ingestData() {
  try {
    const { getFinished, getMatchStats, getMatchEvents, statVal } = await import("../lib/data/api");
    const finished = await getFinished() as Record<string, unknown>[];

    const upsertFix = db.prepare(`
      UPDATE fixtures SET status=?,score_home=?,score_away=?,api_updated=datetime('now')
      WHERE id=?
    `);
    const upBatch = db.transaction(() => {
      for (const f of (finished ?? []).slice(0, 10)) {
        const fix = (f as { fixture: { id: number; status: { short: string } }; goals: { home: number; away: number } });
        upsertFix.run(fix.fixture.status.short, fix.goals.home, fix.goals.away, fix.fixture.id);
      }
    });
    upBatch();
    console.log(`   ✅ ${Math.min(finished?.length ?? 0, 10)} resultados actualizados`);

    // Stats de los últimos 5 partidos finalizados
    const recent = db.prepare(`
      SELECT id FROM fixtures WHERE status='FT' ORDER BY match_date DESC LIMIT 5
    `).all() as { id: number }[];

    for (const { id } of recent) {
      try {
        const stats = await getMatchStats(id) as Array<{ team: { id: number }; statistics: Array<{ type: string; value: unknown }> }>;
        const uSt = db.prepare(`
          INSERT INTO match_stats
            (fixture_id,team_id,shots_total,shots_on_target,possession,corners,fouls,yellow_cards,red_cards,xg)
          VALUES (?,?,?,?,?,?,?,?,?,?)
          ON CONFLICT(fixture_id,team_id) DO UPDATE SET
            shots_total=excluded.shots_total,shots_on_target=excluded.shots_on_target,
            possession=excluded.possession,corners=excluded.corners,xg=excluded.xg
        `);
        for (const s of (stats ?? [])) {
          uSt.run(id, s.team.id,
            statVal(s.statistics, "Shots Total"),
            statVal(s.statistics, "Shots on Goal"),
            statVal(s.statistics, "Ball Possession"),
            statVal(s.statistics, "Corner Kicks"),
            statVal(s.statistics, "Fouls"),
            statVal(s.statistics, "Yellow Cards"),
            statVal(s.statistics, "Red Cards"),
            statVal(s.statistics, "expected_goals"),
          );
        }
        await new Promise(r => setTimeout(r, 700));
      } catch { /* silencioso */ }
    }
    console.log(`   ✅ Stats actualizadas`);
  } catch (e) {
    console.error("   ❌ Error en ingesta:", e instanceof Error ? e.message : e);
  }
}

// ── Forma de equipos ────────────────────────────────────────────

function updateForms() {
  const teams = db.prepare("SELECT id FROM teams").all() as { id: number }[];
  const setForm = db.prepare("UPDATE teams SET form=?,streak=?,updated_at=datetime('now') WHERE id=?");
  const batch = db.transaction(() => {
    for (const { id } of teams) {
      const results = db.prepare(`
        SELECT CASE
          WHEN (f.home_id=? AND f.score_home>f.score_away) THEN 'W'
          WHEN (f.away_id=? AND f.score_away>f.score_home) THEN 'W'
          WHEN f.score_home=f.score_away THEN 'D'
          ELSE 'L' END AS r
        FROM fixtures f
        WHERE (f.home_id=? OR f.away_id=?) AND f.status='FT'
        ORDER BY f.match_date DESC LIMIT 5
      `).all(id,id,id,id) as { r: string }[];
      if (!results.length) continue;
      const form = results.map(x => x.r).join("");
      const streak = [...results].findIndex(x => x.r === "L");
      setForm.run(form, streak === -1 ? results.length : streak, id);
    }
  });
  batch();
}

// ── Predicciones ────────────────────────────────────────────────

function calcPredictions(): number {
  const pending = db.prepare(`
    SELECT f.id,
           ht.xg_avg hxg,ht.xga_avg hxga,ht.elo helo,ht.form hform,ht.sede_bonus hsede,
           ht.corners_avg hcor,ht.cards_avg hcards,
           at.xg_avg axg,at.xga_avg axga,at.elo aelo,at.form aform,at.sede_bonus asede,
           at.corners_avg acor,at.cards_avg acards
    FROM fixtures f
    JOIN teams ht ON f.home_id=ht.id
    JOIN teams at ON f.away_id=at.id
    WHERE f.status='NS'
  `).all() as Record<string, number|string>[];

  const upsert = db.prepare(`
    INSERT INTO predictions
      (fixture_id,xg_home,xg_away,prob_home,prob_draw,prob_away,prob_1x,prob_12,prob_x2,
       prob_o15,prob_u15,prob_o25,prob_u25,prob_o35,prob_u35,
       prob_btts_yes,prob_btts_no,exact_scores,prob_cs_home,prob_cs_away,
       cards_avg_home,cards_avg_away,prob_cards_o35,prob_red,
       corners_avg_home,corners_avg_away,corners_line,prob_corners_over,confidence)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
    ON CONFLICT(fixture_id) DO UPDATE SET
      xg_home=excluded.xg_home,xg_away=excluded.xg_away,
      prob_home=excluded.prob_home,prob_draw=excluded.prob_draw,prob_away=excluded.prob_away,
      prob_o25=excluded.prob_o25,prob_btts_yes=excluded.prob_btts_yes,
      exact_scores=excluded.exact_scores,confidence=excluded.confidence,
      generated_at=datetime('now')
  `);

  const batch = db.transaction(() => {
    for (const f of pending) {
      const p = predict(
        { xgAvg: f.hxg as number, xgaAvg: f.hxga as number, elo: f.helo as number, form: f.hform as string, sede: f.hsede as number },
        { xgAvg: f.axg as number, xgaAvg: f.axga as number, elo: f.aelo as number, form: f.aform as string, sede: f.asede as number }
      );
      const cards = predictCards({
        avgHome: f.hcards as number ?? 3.5,
        avgAway: f.acards as number ?? 3.5,
        eloDiff: Math.abs((f.helo as number) - (f.aelo as number)),
      });
      const corn = predictCorners({
        avgHome: f.hcor as number ?? 5,
        avgAway: f.acor as number ?? 5,
        eloDiff: Math.abs((f.helo as number) - (f.aelo as number)),
      });
      upsert.run(
        f.id,
        p.xgHome, p.xgAway,
        p.probHome, p.probDraw, p.probAway,
        p.prob1X, p.prob12, p.probX2,
        p.probO15, p.probU15, p.probO25, p.probU25, p.probO35, p.probU35,
        p.probBttsY, p.probBttsN,
        JSON.stringify(p.exactScores),
        p.probCsH, p.probCsA,
        cards.avgHome, cards.avgAway, cards.probO35, cards.probRed,
        corn.avgHome, corn.avgAway, corn.line, corn.probOver,
        p.confidence,
      );
    }
  });
  batch();
  return pending.length;
}

// ── Monte Carlo ──────────────────────────────────────────────────

function calcMonteCarlo() {
  const teams = db.prepare(`
    SELECT id,name,flag,group_code,xg_avg,xga_avg,elo,form,sede_bonus
    FROM teams WHERE group_code IS NOT NULL AND group_code != '—'
  `).all() as Record<string,unknown>[];

  const groups: Record<string, Parameters<typeof runMC>[0][string]> = {};
  for (const t of teams) {
    const g = t.group_code as string;
    if (!groups[g]) groups[g] = [];
    groups[g].push({
      id: t.id as number, name: t.name as string, flag: (t.flag as string) ?? "🏳",
      xgAvg: (t.xg_avg as number) ?? 1.2, xgaAvg: (t.xga_avg as number) ?? 1.2,
      elo: (t.elo as number) ?? 1700, form: (t.form as string) ?? "DDDDD",
      sede: (t.sede_bonus as number) ?? 0.02,
    });
  }
  const results = runMC(groups, 10000);
  db.prepare("INSERT INTO tournament_sims (sims,data) VALUES (?,?)").run(10000, JSON.stringify(results));
}

// ── Telegram helpers ────────────────────────────────────────────

async function sendMorningDigest() {
  const today = new Date().toISOString().split("T")[0];
  const matches = db.prepare(`
    SELECT ht.name hn,ht.flag hf,at.name an,at.flag af,
           p.prob_home,p.prob_away
    FROM fixtures f
    JOIN teams ht ON f.home_id=ht.id
    JOIN teams at ON f.away_id=at.id
    LEFT JOIN predictions p ON p.fixture_id=f.id
    WHERE date(f.match_date)=? AND f.status='NS'
    ORDER BY f.match_date
  `).all(today) as Record<string,unknown>[];

  const latest = db.prepare("SELECT data FROM tournament_sims ORDER BY generated_at DESC LIMIT 1").get() as { data: string } | undefined;
  const sims = latest ? JSON.parse(latest.data) : [];

  await sendDailySummary({
    date: today,
    matches: matches.map(m => ({
      home: m.hn as string, away: m.an as string,
      hf: m.hf as string, af: m.af as string,
      probH: (m.prob_home as number) ?? 0.33,
      probA: (m.prob_away as number) ?? 0.33,
    })),
    topBet: null, // podrías calcular aquí la mejor apuesta del día
    botaOro: sims.slice(0, 5).map((s: Record<string,unknown>) => ({
      name: "Estrella de " + s.name,
      team: s.name as string,
      prob: s.probChampion as number,
    })),
  });
  console.log("   ✅ Resumen matutino enviado");
}

async function dispatchDailyCombis() {
  const today = new Date().toISOString().split("T")[0];
  const preds = db.prepare(`
    SELECT f.id,ht.name hn,ht.flag hf,at.name an,at.flag af,
           p.prob_home,p.prob_away,p.prob_o25,p.prob_btts_yes,
           p.xg_home,p.xg_away
    FROM fixtures f
    JOIN teams ht ON f.home_id=ht.id
    JOIN teams at ON f.away_id=at.id
    JOIN predictions p ON p.fixture_id=f.id
    WHERE date(f.match_date)=? AND f.status='NS'
    ORDER BY p.confidence DESC LIMIT 10
  `).all(today) as Record<string,unknown>[];

  if (!preds.length) { console.log("   ℹ️ Sin partidos hoy para combinadas"); return; }

  // Construye pool de apuestas con valor
  type Leg = { match: string; selection: string; prob: number; odds: string; note: string };
  const pool: Leg[] = [];
  for (const p of preds) {
    const match = `${p.hf}${p.hn} vs ${p.af}${p.an}`;
    const mkO = (pr: number) => (1 / Math.max(pr, 0.02) * 1.08).toFixed(2);
    const mkE = (pr: number) => pr - 1 / parseFloat(mkO(pr));
    const cands = [
      { sel: `${p.hn} gana`,      prob: p.prob_home as number, note: `xG ${(p.xg_home as number).toFixed(2)}` },
      { sel: `${p.an} gana`,      prob: p.prob_away as number, note: `xG ${(p.xg_away as number).toFixed(2)}` },
      { sel: "+2.5 goles",        prob: p.prob_o25 as number,   note: `xG total ${((p.xg_home as number)+(p.xg_away as number)).toFixed(2)}` },
      { sel: "Ambos marcan - SÍ", prob: p.prob_btts_yes as number, note: "Ambos generan xG > 0.9" },
    ];
    for (const c of cands) {
      if (c.prob && mkE(c.prob) > 0.04) {
        pool.push({ match, selection: c.sel, prob: c.prob, odds: mkO(c.prob), note: c.note });
      }
    }
  }

  // Genera combinadas de 2 partidos distintos
  const combis: Combi[] = [];
  const names = ["La Segura","La Equilibrada","La Atrevida","La Premium"];
  const types = ["Conservadora","Equilibrada","Atrevida","Triple de valor"];

  for (let i = 0; i < pool.length && combis.length < 4; i++) {
    for (let j = i + 1; j < pool.length; j++) {
      if (pool[i].match === pool[j].match) continue;
      const odds = parseFloat(pool[i].odds) * parseFloat(pool[j].odds);
      const prob = pool[i].prob * pool[j].prob;
      const ev = (prob * (odds - 1) - (1 - prob)) * 100;
      if (ev > 4) {
        combis.push({
          type: types[combis.length] ?? "Doble",
          name: names[combis.length] ?? `Combinada ${combis.length+1}`,
          legs: [pool[i], pool[j]],
          totalOdds: odds.toFixed(2),
          prob: (prob * 100).toFixed(1) + "%",
          ev: ev.toFixed(1),
          why: `${pool[i].note} · ${pool[j].note}`,
          risk: "Resultado inesperado de cualquiera de los partidos elimina la combinada.",
        });
        break;
      }
    }
  }

  if (combis.length > 0) {
    await sendDailyCombis(combis);
    console.log(`   ✅ ${combis.length} combinadas enviadas`);
  } else {
    console.log("   ℹ️ Sin combinadas con valor hoy");
  }
}

main().catch(e => { console.error("❌ Error fatal:", e); process.exit(1); });
