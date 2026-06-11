// lib/data/telegram.ts
// Servicio Telegram completo — previas, combinadas, alertas en vivo, resumen diario

import axios from "axios";
import { getDb } from "../db/index";
import { getLineup } from "./players";

// ─── Config ─────────────────────────────────────────────────────
const TOKEN   = () => process.env.TELEGRAM_BOT_TOKEN ?? "";
const CHAT    = () => process.env.TELEGRAM_CHAT_ID   ?? "";
const CHANNEL = () => process.env.TELEGRAM_CHANNEL_ID ?? "";
const HOURS   = () => parseInt(process.env.TELEGRAM_PREVIEW_HOURS ?? "1");
const API     = () => `https://api.telegram.org/bot${TOKEN()}`;
const RATE    = 4200; // COP/USD

// ─── Tipos ──────────────────────────────────────────────────────
export type MsgType = "preview" | "combis" | "result" | "live_alert" | "daily_summary" | "test";

export interface BotInfo { ok: boolean; username?: string; error?: string }

export interface MatchData {
  fixtureId: number;
  homeTeam: string; awayTeam: string;
  homeFlag: string; awayFlag: string;
  matchDate: string; venue: string; groupCode: string;
  // Predicción
  xgHome: number; xgAway: number;
  probHome: number; probDraw: number; probAway: number;
  probO25: number; probBttsY: number;
  probCsH: number; probCsA: number;
  probO35: number;
  exactScores: Array<{ score: string; prob: number }>;
  confidence: number;
  // Histórico
  homeElo: number; awayElo: number;
  homeForm: string; awayForm: string;
  homeWc: string; awayWc: string;
  homeStreak: number; awayStreak: number;
  homeO25: number; awayO25: number;
  homeBtts: number; awayBtts: number;
  // Combinadas sugeridas (generadas por el modelo)
  bets: Array<{ market: string; selection: string; prob: number; note: string }>;
  // Real Lineups Flag
  isRealLineup?: boolean;
  realHomeFormation?: string;
  realAwayFormation?: string;
  realHomePlayers?: string[];
  realAwayPlayers?: string[];
}

export interface CombiLeg { match: string; selection: string; odds: string; note: string }
export interface Combi {
  type: string; name: string;
  legs: CombiLeg[];
  totalOdds: string; prob: string; ev: string;
  why: string; risk: string;
}

// ─── Utilidades de formato ───────────────────────────────────────
function esc(s: string | number): string {
  return String(s).replace(/([_*[\]()~`>#+\-=|{}.!\\])/g, "\\$1");
}
function pct(p: number) { return `${(p * 100).toFixed(1)}%`; }
function odds(p: number) { return (1 / Math.max(p, 0.02)).toFixed(2); }
function cop(usd: number) {
  return "$" + (Math.round(usd * RATE / 500) * 500).toLocaleString("es-CO");
}
function bar(p: number, n = 10): string {
  const f = Math.round(p * n);
  return "█".repeat(f) + "░".repeat(n - f);
}
function formEmoji(form: string): string {
  return (form || "").split("").map(c => c === "W" ? "🟢" : c === "D" ? "🟡" : "🔴").join("");
}
function confLabel(c: number): string {
  return c >= 0.75 ? "🟢 Alta" : c >= 0.55 ? "🟡 Media" : "🔴 Baja";
}

// ─── Constructores de mensajes ───────────────────────────────────

export function buildPreview(d: MatchData): string {
  const date = new Date(d.matchDate).toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit",
  });
  const fav =
    d.probHome > d.probAway + 0.08 ? `${d.homeFlag} ${d.homeTeam}` :
    d.probAway > d.probHome + 0.08 ? `${d.awayFlag} ${d.awayTeam}` : "⚖️ Equilibrado";

  const top3 = d.exactScores.slice(0, 3)
    .map(s => `  \\- \`${s.score}\` → ${esc(pct(s.prob))}`)
    .join("\n");

  const betsSection = d.bets.length > 0
    ? d.bets.map((b, i) =>
        `${i + 1}\\. *${esc(b.selection)}* \\(${esc(odds(b.prob))}x\\)\n   _${esc(b.note)}_`
      ).join("\n\n")
    : "_Sin apuestas con valor estadístico positivo_";

  const stakeEx = 50000;
  const favProb = Math.max(d.probHome, d.probAway);
  const favOdds = parseFloat(odds(favProb));
  const ganancia = cop(stakeEx / RATE * favOdds);

  let homeFormStr = "";
  let awayFormStr = "";
  let homePlayersStr = "";
  let awayPlayersStr = "";
  let titleStr = "📋 *Alineaciones Probables:*";

  if (d.isRealLineup && d.realHomeFormation && d.realHomePlayers && d.realAwayPlayers) {
    titleStr = "✅ *Alineaciones Oficiales Confirmadas:*";
    homeFormStr = d.realHomeFormation;
    awayFormStr = d.realAwayFormation || "";
    homePlayersStr = d.realHomePlayers.join(", ");
    awayPlayersStr = d.realAwayPlayers.join(", ");
  } else {
    const homeL = getLineup(d.homeTeam);
    const awayL = getLineup(d.awayTeam);
    homeFormStr = homeL.formation;
    awayFormStr = awayL.formation;
    homePlayersStr = homeL.lineup.join(", ");
    awayPlayersStr = awayL.lineup.join(", ");
  }

  return `⚽ *PREVIA MUNDIAL 2026 — GRUPO ${esc(d.groupCode)}*
${d.homeFlag} *${esc(d.homeTeam)}* vs *${esc(d.awayTeam)}* ${d.awayFlag}

📅 ${esc(date)}
🏟 ${esc(d.venue)}
${titleStr}
${d.homeFlag} *${esc(d.homeTeam)}* \\(${esc(homeFormStr)}\\):
_${esc(homePlayersStr)}_

${d.awayFlag} *${esc(d.awayTeam)}* \\(${esc(awayFormStr)}\\):
_${esc(awayPlayersStr)}_

━━━━━━━━━━━━━━━━━━━━━
📊 *PROBABILIDADES*
━━━━━━━━━━━━━━━━━━━━━
*1️⃣ ${esc(d.homeTeam)} gana*
   ${bar(d.probHome)} ${esc(pct(d.probHome))} \\| cuota ${esc(odds(d.probHome))}x

*✖️ Empate*
   ${bar(d.probDraw)} ${esc(pct(d.probDraw))} \\| cuota ${esc(odds(d.probDraw))}x

*2️⃣ ${esc(d.awayTeam)} gana*
   ${bar(d.probAway)} ${esc(pct(d.probAway))} \\| cuota ${esc(odds(d.probAway))}x

🎯 Favorito: *${esc(fav)}*
📈 xG esperado: \`${esc(d.xgHome.toFixed(2))}\` — \`${esc(d.xgAway.toFixed(2))}\`
🔒 Confianza modelo: ${esc(confLabel(d.confidence))}

━━━━━━━━━━━━━━━━━━━━━
⚽ *MERCADOS CLAVE*
━━━━━━━━━━━━━━━━━━━━━
\\+2\\.5 goles:    *${esc(pct(d.probO25))}* \\(${esc(odds(d.probO25))}x\\)
\\+3\\.5 goles:    *${esc(pct(d.probO35))}* \\(${esc(odds(d.probO35))}x\\)
Ambos marcan:  *${esc(pct(d.probBttsY))}* \\(${esc(odds(d.probBttsY))}x\\)
${esc(d.homeTeam)} a cero: *${esc(pct(d.probCsH))}* \\(${esc(odds(d.probCsH))}x\\)
${esc(d.awayTeam)} a cero: *${esc(pct(d.probCsA))}* \\(${esc(odds(d.probCsA))}x\\)

🎰 *Top marcadores exactos:*
${top3}

━━━━━━━━━━━━━━━━━━━━━
🏛 *DATOS HISTÓRICOS*
━━━━━━━━━━━━━━━━━━━━━
${d.homeFlag} *${esc(d.homeTeam)}*
  ELO ${d.homeElo} \\| ${esc(d.homeWc)}
  Forma: ${formEmoji(d.homeForm)} \\| Racha: ${d.homeStreak}p invicto
  Hist \\+2\\.5: ${d.homeO25}% \\| BTTS: ${d.homeBtts}%

${d.awayFlag} *${esc(d.awayTeam)}*
  ELO ${d.awayElo} \\| ${esc(d.awayWc)}
  Forma: ${formEmoji(d.awayForm)} \\| Racha: ${d.awayStreak}p invicto
  Hist \\+2\\.5: ${d.awayO25}% \\| BTTS: ${d.awayBtts}%

━━━━━━━━━━━━━━━━━━━━━
💎 *APUESTAS CON VALOR ESTADÍSTICO*
━━━━━━━━━━━━━━━━━━━━━
${betsSection}

💰 Ejemplo: *$${esc(stakeEx.toLocaleString("es-CO"))} COP* al favorito
   → Si acierta: *${esc(ganancia)}* 🎯

━━━━━━━━━━━━━━━━━━━━━
🤖 _Motor xG \\+ ELO \\+ Histórico 1930\\-2022_
⚠️ _Análisis estadístico de entretenimiento\\. No es asesoría de apuestas\\. \\+18_`;
}

export function buildCombisMsg(combis: Combi[]): string {
  if (!combis.length) return "📊 _Sin combinadas con valor matemático para hoy_";

  const sections = combis.slice(0, 4).map((c, i) => {
    const legs = c.legs.map(l =>
      `   • ${esc(l.match)} → *${esc(l.selection)}* @ ${esc(l.odds)}x\n     _${esc(l.note)}_`
    ).join("\n");
    return `*${i + 1}\\. ${esc(c.name)}* \\[${esc(c.type)}\\]
${legs}
📊 Cuota: \`${esc(c.totalOdds)}x\` \\| Prob: ${esc(c.prob)} \\| EV: \\+${esc(c.ev)}%
📝 ${esc(c.why)}
⚠️ ${esc(c.risk)}`;
  });

  return `💎 *COMBINADAS DEL DÍA — MUNDIAL 2026*
━━━━━━━━━━━━━━━━━━━━━

${sections.join("\n\n━━━━━━━━━━━━━━━━━━━━━\n\n")}

💰 Base de cálculo: $10\\.000 COP por combinada
⚠️ _Análisis estadístico de entretenimiento\\. No es asesoría de apuestas\\. \\+18_`;
}

export function buildSencillasMsg(legs: any[]): string {
  if (!legs.length) return "📊 _Sin apuestas individuales claras para hoy_";

  const list = legs.map((l, i) => {
    const probStr = l.prob ? ` \\(Prob: ${esc((l.prob * 100).toFixed(1))}%\\)` : "";
    const evStr = l.ev ? `EV: \\+${esc(l.ev)}%` : "";
    const eloStr = l.elo ? ` \\| ELO: ${esc(l.elo)}` : "";
    return `*${i + 1}\\. ${esc(l.match)}*
🎯 *${esc(l.selection)}* \\| Cuota: \`${esc(l.odds)}x\`${probStr}
📈 ${evStr}${eloStr}
📝 _${esc(l.note)}_`;
  }).join("\n\n");

  return `🎯 *MEJORES APUESTAS SENCILLAS DEL DÍA*
━━━━━━━━━━━━━━━━━━━━━

${list}

━━━━━━━━━━━━━━━━━━━━━
💡 *Tip:* Las apuestas sencillas tienen menor riesgo y son ideales para asegurar ganancias a largo plazo\\.
⚠️ _Análisis estadístico\\. Juega con responsabilidad\\. \\+18_`;
}

export function buildApostarMsg(): string {
  return `🎓 *GUÍA PREMIUM: CÓMO APOSTAR*
━━━━━━━━━━━━━━━━━━━━━

*1️⃣ APUESTAS SENCILLAS \\(/sencillas\\)*
Auestas a un solo evento \\(ej\\. Gana México\\)\\.
✅ *Pros:* Mayor probabilidad de ganar, ganancias más consistentes\\.
❌ *Contras:* Las cuotas son más bajas, necesitas apostar más para ganar mucho\\.
💡 _Recomendación:_ Usa el 80% de tu presupuesto aquí\\.

*2️⃣ APUESTAS COMBINADAS \\(/combinadas\\)*
Unes varias apuestas en un solo tiquete\\. Para ganar, *TODAS* deben cumplirse\\.
✅ *Pros:* Multiplican las cuotas\\. Con muy poco dinero puedes ganar mucho\\.
❌ *Contras:* Alto riesgo\\. Si falla un solo partido, pierdes todo\\.
💡 _Recomendación:_ Usa solo el 20% de tu presupuesto\\. Diversión de alto riesgo\\.

*3️⃣ ¿CÓMO LEER EL BOT?*
• *xG \\(Goles Esperados\\)*: Si el xG es 2\\.5, el equipo generará ocasiones para meter 2 o 3 goles\\.
• *ELO*: Mide la jerarquía histórica \\(Brasil \\> 2000, equipos flojos \\< 1700\\)\\.
• *EV\\+ \\(Valor Esperado\\)*: El bot solo sugiere apuestas donde la casa de apuestas se ha equivocado y está pagando MÁS de lo que debería matemáticamente\\.

¡Sigue nuestras predicciones usando /sencillas o /combinadas\\!`;
}

export function buildTablaMsg(group: string, teams: Array<{ pos: number, name: string, flag: string, pts: number, gd: number, form: string }>): string {
  const rows = teams.map(t => 
    `*${t.pos}\\.* ${t.flag} ${esc(t.name)} \\| *${t.pts} pts* \\(DG: ${t.gd > 0 ? '\\+' : ''}${t.gd}\\) \\| ${formEmoji(t.form)}`
  ).join("\n");

  return `🏆 *TABLA DE POSICIONES \\- GRUPO ${esc(group)}*
━━━━━━━━━━━━━━━━━━━━━
${rows}

🟢 _Los dos primeros avanzan a octavos\\. El mejor 3º de todos los grupos también puede clasificar\\._`;
}

export function buildResultMsg(p: {
  homeTeam: string; awayTeam: string;
  homeFlag: string; awayFlag: string;
  scoreHome: number; scoreAway: number;
  xgHome: number; xgAway: number;
  probHome: number; probAway: number;
}): string {
  const predicted =
    (p.scoreHome > p.scoreAway && p.probHome > p.probAway) ||
    (p.scoreHome < p.scoreAway && p.probAway > p.probHome);

  const emoji = predicted ? "✅" : "📊";
  return `${emoji} *RESULTADO FINAL*
${p.homeFlag} *${esc(p.homeTeam)}* ${p.scoreHome} \\— ${p.scoreAway} *${esc(p.awayTeam)}* ${p.awayFlag}

🤖 Predicción modelo: ${esc(p.xgHome.toFixed(1))} \\— ${esc(p.xgAway.toFixed(1))} xG
${predicted ? "✅ El modelo acertó el sentido del resultado" : "📊 El modelo no acertó este resultado"}`;
}

export function buildDailySummary(params: {
  date: string;
  matches: Array<{ home: string; away: string; hf: string; af: string; probH: number; probA: number }>;
  topBet: { match: string; selection: string; prob: number; note: string } | null;
  botaOro?: Array<{ name: string; team: string; prob: number }>;
}): string {
  const dateStr = new Date(params.date).toLocaleDateString("es-CO", { weekday: "long", day: "numeric", month: "long" });
  const matchLines = params.matches.map(m =>
    `${m.hf} ${esc(m.home)} vs ${esc(m.away)} ${m.af} \\| ${esc((m.probH * 100).toFixed(0))}% — ${esc((m.probA * 100).toFixed(0))}%`
  ).join("\n");

  const bootaLines = params.botaOro?.slice(0, 3).map((p, i) =>
    `${["🥇","🥈","🥉"][i]} *${esc(p.name)}* \\(${esc(p.team)}\\) ${esc((p.prob * 100).toFixed(1))}%`
  ).join("\n") ?? "_No disponible_";

  const top = params.topBet
    ? `🎯 *Apuesta del día:* ${esc(params.topBet.selection)}\n   _${esc(params.topBet.note)}_`
    : "_Sin apuesta destacada hoy_";

  return `🌅 *RESUMEN DEL DÍA — MUNDIAL 2026*
📅 ${esc(dateStr)}

⚽ *PARTIDOS DE HOY*
${matchLines || "_Sin partidos hoy_"}

${top}

🥾 *BOTA DE ORO \\(probabilidad acumulada\\)*
${bootaLines}

🤖 _Predicciones actualizadas · Motor xG \\+ ELO \\+ Monte Carlo_
⚠️ _Análisis estadístico\\. No es asesoría de apuestas\\. \\+18_`;
}

// ─── Envío ───────────────────────────────────────────────────────

export async function send(text: string, chatId?: string): Promise<boolean> {
  const tok = TOKEN();
  if (!tok || tok === "pon_tu_token_aqui") {
    console.warn("[TG] Token no configurado — mensaje omitido");
    return false;
  }
  const target = chatId ?? CHAT();
  if (!target) { console.warn("[TG] Chat ID no configurado"); return false; }

  try {
    await axios.post(`${API()}/sendMessage`, {
      chat_id: target,
      text,
      parse_mode: "MarkdownV2",
      disable_web_page_preview: true,
    });
    return true;
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    // Intento en canal si existe y es destino distinto
    if (CHANNEL() && target !== CHANNEL()) return send(text, CHANNEL());
    console.error("[TG] Error:", (e as any).response?.data || msg);
    return false;
  }
}

async function sendAndLog(text: string, type: MsgType, fixtureId?: number): Promise<void> {
  const db = await getDb();
  const ok = await send(text);
  // También envía al canal si está configurado y es distinto
  if (CHANNEL() && CHANNEL() !== CHAT()) await send(text, CHANNEL());
  await db.execute({
    sql: "INSERT INTO tg_log (fixture_id,type,status) VALUES (?,?,?)",
    args: [fixtureId ?? null, type, ok ? "ok" : "error"]
  });
}

// ─── Lógica de negocio ───────────────────────────────────────────

/** Verifica la conexión del bot */
export async function testBot(): Promise<BotInfo> {
  const tok = TOKEN();
  if (!tok || tok === "pon_tu_token_aqui")
    return { ok: false, error: "TELEGRAM_BOT_TOKEN no configurado en .env" };
  try {
    const r = await axios.get(`${API()}/getMe`);
    return { ok: true, username: r.data.result?.username };
  } catch (e: unknown) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}

/** Envía un mensaje de prueba */
export async function sendTest(): Promise<boolean> {
  const msg = `✅ *Test de conexión — Mundial 2026 Predictor*
Bot configurado correctamente\\.
Las previas se enviarán ${esc(HOURS())} horas antes de cada partido\\.
⚠️ _Análisis estadístico de entretenimiento\\. No es asesoría de apuestas\\._`;
  return send(msg);
}

/** Envía previas automáticas para partidos próximos */
export async function sendScheduledPreviews(): Promise<number> {
  const db = await getDb();
  const now = new Date();
  const cutoff = new Date(now.getTime() + HOURS() * 3_600_000);

  const result = await db.execute({
    sql: `
    SELECT f.id,f.match_date,f.venue,f.group_code,
           ht.name hn,ht.flag hf,ht.elo helo,ht.form hform,ht.wc_best hwc,
           ht.streak hstreak,ht.o25_pct ho25,ht.btts_pct hbtts,
           at.name an,at.flag af,at.elo aelo,at.form aform,at.wc_best awc,
           at.streak astreak,at.o25_pct ao25,at.btts_pct abtts,
           p.xg_home,p.xg_away,p.prob_home,p.prob_draw,p.prob_away,
           p.prob_o25,p.prob_btts_yes,p.prob_cs_home,p.prob_cs_away,
           p.prob_o35,p.exact_scores,p.confidence
    FROM fixtures f
    JOIN teams ht ON f.home_id=ht.id
    JOIN teams at ON f.away_id=at.id
    LEFT JOIN predictions p ON p.fixture_id=f.id
    -- No re-enviar si ya mandamos previa hoy
    LEFT JOIN tg_log tl ON tl.fixture_id=f.id AND tl.type='preview' AND date(tl.sent_at)=date('now')
    WHERE f.status='NS'
      AND f.match_date > ?
      AND f.match_date <= ?
      AND tl.id IS NULL
  `,
    args: [now.toISOString(), cutoff.toISOString()]
  });
  const rows = result.rows as Record<string, unknown>[];

  let sent = 0;
  for (const r of rows) {
    const bets = buildSuggestedBets(r);
    const data: MatchData = {
      fixtureId:   r.id as number,
      homeTeam:    r.hn as string,  awayTeam:  r.an as string,
      homeFlag:    r.hf as string,  awayFlag:  r.af as string,
      matchDate:   r.match_date as string,
      venue:       (r.venue as string) ?? "Por confirmar",
      groupCode:   (r.group_code as string) ?? "—",
      xgHome:      (r.xg_home as number)  ?? 1.2,
      xgAway:      (r.xg_away as number)  ?? 1.2,
      probHome:    (r.prob_home as number) ?? 0.33,
      probDraw:    (r.prob_draw as number) ?? 0.33,
      probAway:    (r.prob_away as number) ?? 0.33,
      probO25:     (r.prob_o25 as number)  ?? 0.55,
      probO35:     (r.prob_o35 as number)  ?? 0.35,
      probBttsY:   (r.prob_btts_yes as number) ?? 0.50,
      probCsH:     (r.prob_cs_home as number)  ?? 0.30,
      probCsA:     (r.prob_cs_away as number)  ?? 0.30,
      exactScores: JSON.parse((r.exact_scores as string) ?? "[]"),
      confidence:  (r.confidence as number) ?? 0.6,
      homeElo:     r.helo as number, awayElo:     r.aelo as number,
      homeForm:    r.hform as string, awayForm:   r.aform as string,
      homeWc:      r.hwc as string,  awayWc:     r.awc as string,
      homeStreak:  r.hstreak as number, awayStreak: r.astreak as number,
      homeO25:     r.ho25 as number, awayO25:    r.ao25 as number,
      homeBtts:    r.hbtts as number, awayBtts:  r.abtts as number,
      bets,
    };

    // INTENTAR OBTENER ALINEACIÓN OFICIAL
    try {
      const R_KEY = process.env.RAPIDAPI_KEY;
      if (R_KEY && R_KEY !== "pon_tu_key_aqui") {
        const lineRes = await axios.get(`https://${process.env.RAPIDAPI_HOST || "api-football-v1.p.rapidapi.com"}/fixtures/lineups?fixture=${data.fixtureId}`, {
          headers: { 'X-RapidAPI-Key': R_KEY }
        });
        if (lineRes.data?.response && lineRes.data.response.length === 2) {
          data.isRealLineup = true;
          data.realHomeFormation = lineRes.data.response[0].formation;
          data.realHomePlayers = lineRes.data.response[0].startXI.map((p: any) => p.player.name);
          data.realAwayFormation = lineRes.data.response[1].formation;
          data.realAwayPlayers = lineRes.data.response[1].startXI.map((p: any) => p.player.name);
        }
      }
    } catch (e) {
      console.warn("⚠️ No se pudo obtener alineación real, usando probables.");
    }

    await sendAndLog(buildPreview(data), "preview", data.fixtureId);
    sent++;
    await sleep(1500);
  }
  return sent;
}

/** Envía combinadas del día */
export async function sendDailyCombis(combis: Combi[]): Promise<void> {
  await sendAndLog(buildCombisMsg(combis), "combis");
}

/** Envía resumen matutino */
export async function sendDailySummary(params: Parameters<typeof buildDailySummary>[0]): Promise<void> {
  await sendAndLog(buildDailySummary(params), "daily_summary");
}

/** Envía resultado de un partido jugado */
export async function sendResult(p: Parameters<typeof buildResultMsg>[0] & { fixtureId: number }): Promise<void> {
  await sendAndLog(buildResultMsg(p), "result", p.fixtureId);
}

// ─── Helper interno ──────────────────────────────────────────────

function buildSuggestedBets(r: Record<string, unknown>): MatchData["bets"] {
  const bets: MatchData["bets"] = [];
  const addIf = (prob: number, market: string, selection: string, note: string) => {
    const edge = prob - 1 / (1 / Math.max(prob, 0.02) * 0.95);
    if (edge > -0.08) bets.push({ market, selection, prob, note });
  };
  const ph = (r.prob_home as number) ?? 0;
  const pa = (r.prob_away as number) ?? 0;
  const po = (r.prob_o25 as number)  ?? 0;
  const pb = (r.prob_btts_yes as number) ?? 0;
  const xh = (r.xg_home as number) ?? 0;
  const xa = (r.xg_away as number) ?? 0;
  addIf(ph, "Resultado", `${r.hn} gana`, `xG ${xh.toFixed(2)} | ELO ${r.helo} | Forma ${r.hform}`);
  addIf(pa, "Resultado", `${r.an} gana`, `xG ${xa.toFixed(2)} | ELO ${r.aelo} | Forma ${r.aform}`);
  addIf(po, "+2.5 goles", "Más de 2.5 goles", `xG combinado ${(xh + xa).toFixed(2)}`);
  addIf(pb, "BTTS", "Ambos marcan SÍ", `P(${r.hn} anota): ${((1-Math.exp(-xh))*100).toFixed(0)}%`);
  return bets.slice(0, 3);
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }
