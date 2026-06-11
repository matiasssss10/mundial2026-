// app/partido/[id]/page.tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { getDb } from "@/lib/db/index";
import { pct, toOdds, fairOdds, edgeVal, evVal, cop, confInfo, kellyStake } from "@/lib/utils";

export const revalidate = 900;

const STAKE_COP = 50000;
const STAKE_USD = STAKE_COP / 4200;

interface Market { title: string; icon: string; confidence: number; bets: Bet[] }
interface Bet { label: string; prob: number; note: string; why: string; lowConf?: boolean }

export default function MatchPage({ params }: { params: { id: string } }) {
  const id = parseInt(params.id);
  if (isNaN(id)) notFound();

  const db = getDb();

  const m = db.prepare(`
    SELECT f.id, f.match_date, f.venue, f.city, f.group_code, f.status,
           f.score_home, f.score_away,
           ht.id hid, ht.name hn, ht.flag hf, ht.elo helo, ht.form hform,
           ht.xg_avg hxg, ht.xga_avg hxga, ht.cs_pct hcs, ht.btts_pct hbtts,
           ht.o25_pct ho25, ht.wc_best hwc, ht.strength hstr, ht.streak hstreak,
           ht.corners_avg hcor, ht.sp_pct hsp, ht.wc_titles hwct, ht.note hnote,
           at.id aid, at.name an, at.flag af, at.elo aelo, at.form aform,
           at.xg_avg axg, at.xga_avg axga, at.cs_pct acs, at.btts_pct abtts,
           at.o25_pct ao25, at.wc_best awc, at.strength astr, at.streak astreak,
           at.corners_avg acor, at.sp_pct asp, at.wc_titles awct, at.note anote,
           p.xg_home, p.xg_away,
           p.prob_home, p.prob_draw, p.prob_away,
           p.prob_1x, p.prob_12, p.prob_x2,
           p.prob_o15, p.prob_u15, p.prob_o25, p.prob_u25, p.prob_o35, p.prob_u35,
           p.prob_btts_yes, p.prob_btts_no,
           p.exact_scores, p.prob_cs_home, p.prob_cs_away,
           p.cards_avg_home, p.cards_avg_away, p.prob_cards_o35, p.prob_red,
           p.corners_avg_home, p.corners_avg_away, p.corners_line, p.prob_corners_over,
           p.confidence, p.generated_at
    FROM fixtures f
    JOIN teams ht ON f.home_id = ht.id
    JOIN teams at ON f.away_id = at.id
    LEFT JOIN predictions p ON p.fixture_id = f.id
    WHERE f.id = ?
  `).get(id) as Record<string, unknown> | undefined;

  if (!m) notFound();

  const events = db.prepare(`
    SELECT e.type, e.detail, e.minute, pl.name player_name, t.flag team_flag
    FROM match_events e
    LEFT JOIN players pl ON e.player_id = pl.id
    LEFT JOIN teams t ON e.team_id = t.id
    WHERE e.fixture_id = ? ORDER BY e.minute ASC
  `).all(id) as Record<string, unknown>[];

  const scores: Array<{ score: string; prob: number }> =
    m.exact_scores ? JSON.parse(m.exact_scores as string) : [];

  const dateStr = new Date(m.match_date as string).toLocaleDateString("es-CO", {
    weekday: "long", day: "numeric", month: "long", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

  const played = m.status === "FT";
  const conf = m.confidence as number ?? 0.6;
  const ci = confInfo(conf);

  // ── Mercados ──────────────────────────────────────────────────
  const xgH = m.xg_home as number ?? 0;
  const xgA = m.xg_away as number ?? 0;

  const markets: Market[] = [
    {
      title: "Resultado 1X2", icon: "⚽", confidence: conf,
      bets: [
        { label: `${m.hf} ${m.hn} gana`, prob: m.prob_home as number ?? 0, note: `ELO ${m.helo} · xG ${xgH.toFixed(2)} · Forma ${m.hform}`, why: `${m.hn} (ELO ${m.helo}) tiene ${pct(m.prob_home as number)} de probabilidad según Poisson. Su xG histórico de ${m.hxg}/p y la forma ${m.hform} respaldan este escenario. WC: ${m.hwc}.` },
        { label: "Empate", prob: m.prob_draw as number ?? 0, note: `Diferencia ELO: ${Math.abs((m.helo as number) - (m.aelo as number))} pts`, why: `Con diferencia ELO de ${Math.abs((m.helo as number) - (m.aelo as number))} puntos y xG combinado de ${(xgH + xgA).toFixed(2)}, el empate tiene ${pct(m.prob_draw as number)} según el modelo de Poisson.` },
        { label: `${m.af} ${m.an} gana`, prob: m.prob_away as number ?? 0, note: `ELO ${m.aelo} · xG ${xgA.toFixed(2)} · Forma ${m.aform}`, why: `${m.an} (ELO ${m.aelo}) lleva ${m.astreak} partidos sin perder. Su xG de ${m.axg}/p y forma ${m.aform} generan ${pct(m.prob_away as number)}. WC: ${m.awc}.` },
      ],
    },
    {
      title: "Doble Oportunidad", icon: "🛡", confidence: conf * 0.9,
      bets: [
        { label: `${m.hn} o Empate (1X)`, prob: m.prob_1x as number ?? 0, note: `Cubre victoria + empate local`, why: "Apuesta conservadora. Cubre 2 de 3 resultados posibles. Valor matemático cuando la cuota de la casa supera la probabilidad implícita." },
        { label: `${m.hn} o ${m.an} (12)`, prob: m.prob_12 as number ?? 0, note: "Excluye el empate", why: "El empate es el resultado más difícil de predecir. Esta apuesta protege ante ambos ganadores potenciales." },
        { label: `${m.an} o Empate (X2)`, prob: m.prob_x2 as number ?? 0, note: `Cubre victoria + empate visitante`, why: `Protección ante victoria de ${m.hn}. Útil cuando ${m.an} tiene buena defensa (CS: ${m.acs}%).` },
      ],
    },
    {
      title: "Total de Goles", icon: "🎯", confidence: conf * 0.85,
      bets: [
        { label: "+1.5 goles", prob: m.prob_o15 as number ?? 0, note: `xG total: ${(xgH + xgA).toFixed(2)}`, why: `xG combinado ${(xgH + xgA).toFixed(2)} → ${pct(m.prob_o15 as number)} de probabilidad. Casi siempre hay al menos 2 goles en partidos mundialistas.` },
        { label: "-1.5 goles", prob: m.prob_u15 as number ?? 0, note: "Partido muy cerrado", why: `Solo ${pct(m.prob_u15 as number)} de probabilidad. Raro en mundiales — los equipos top generan xG alto.` },
        { label: "+2.5 goles", prob: m.prob_o25 as number ?? 0, note: `Hist. ${m.hn}: ${m.ho25}% · ${m.an}: ${m.ao25}%`, why: `xG ${(xgH + xgA).toFixed(2)} sugiere ${pct(m.prob_o25 as number)}. Histórico: ${m.hn} ${m.ho25}%, ${m.an} ${m.ao25}%. Media WC: ${(((m.hxg as number) + (m.axg as number)) / 2).toFixed(2)} goles/p cada uno.` },
        { label: "-2.5 goles", prob: m.prob_u25 as number ?? 0, note: `Def ${m.hn}: ${m.hxga}/p · ${m.an}: ${m.axga}/p`, why: `Con CS de ${m.hcs}% y ${m.acs}%, hay ${pct(m.prob_u25 as number)} de que el partido quede bajo 2.5 goles.` },
        { label: "+3.5 goles", prob: m.prob_o35 as number ?? 0, note: `xG combinado: ${(xgH + xgA).toFixed(2)}`, why: `Alta cuota, menor probabilidad (${pct(m.prob_o35 as number)}). Solo recomendado cuando xG combinado supera 3.0. Actual: ${(xgH + xgA).toFixed(2)}.` },
        { label: "-3.5 goles", prob: m.prob_u35 as number ?? 0, note: "Partido táctico y cerrado", why: `${pct(m.prob_u35 as number)} de probabilidad de partido cerrado. Favorece cuando ambos equipos tienen buena defensa histórica.` },
      ],
    },
    {
      title: "Ambos Marcan (BTTS)", icon: "⚡", confidence: conf * 0.80,
      bets: [
        { label: "Ambos marcan — SÍ", prob: m.prob_btts_yes as number ?? 0, note: `${m.hn}: ${m.hbtts}% hist · ${m.an}: ${m.abtts}% hist`, why: `P(${m.hn} marca) = ${((1 - Math.exp(-xgH)) * 100).toFixed(0)}%, P(${m.an} marca) = ${((1 - Math.exp(-xgA)) * 100).toFixed(0)}%. BTTS hist: ${m.hbtts}% y ${m.abtts}%.` },
        { label: "Ambos marcan — NO", prob: m.prob_btts_no as number ?? 0, note: `CS ${m.hn}: ${m.hcs}% · CS ${m.an}: ${m.acs}%`, why: `${m.hn} mantiene el cero ${m.hcs}% de sus partidos, ${m.an} el ${m.acs}%. ${pct(m.prob_btts_no as number)} de que alguno no anote.` },
      ],
    },
    {
      title: "Clean Sheet", icon: "🧤", confidence: conf * 0.75,
      bets: [
        { label: `${m.hn} a cero`, prob: m.prob_cs_home as number ?? 0, note: `CS hist: ${m.hcs}% · xG ${m.an}: ${xgA.toFixed(2)}`, why: `${m.hn} mantiene portería a cero en ${m.hcs}% histórico. Con xG de ${m.an} = ${xgA.toFixed(2)}, Poisson da ${pct(m.prob_cs_home as number)}.` },
        { label: `${m.an} a cero`, prob: m.prob_cs_away as number ?? 0, note: `CS hist: ${m.acs}% · xG ${m.hn}: ${xgH.toFixed(2)}`, why: `${m.an} logra clean sheet en ${m.acs}% de sus partidos. Con xG de ${m.hn} = ${xgH.toFixed(2)}, la probabilidad es ${pct(m.prob_cs_away as number)}.` },
      ],
    },
    {
      title: "Tarjetas", icon: "🟨", confidence: 0.42,
      bets: [
        { label: "+3.5 tarjetas totales", prob: m.prob_cards_o35 as number ?? 0, note: `Media ${m.hn}: ${(m.cards_avg_home as number)?.toFixed(1)} · ${m.an}: ${(m.cards_avg_away as number)?.toFixed(1)}`, why: `Promedio histórico ${m.hn}: ${(m.cards_avg_home as number)?.toFixed(1)} tarjetas/p, ${m.an}: ${(m.cards_avg_away as number)?.toFixed(1)}/p. ADVERTENCIA: tarjetas tienen alta varianza.`, lowConf: true },
        { label: "Al menos 1 tarjeta roja", prob: m.prob_red as number ?? 0, note: "Alta varianza — modelo impreciso", why: "Probabilidad base ajustada por intensidad del partido y diferencia ELO. Mercado de alta varianza — confianza muy baja.", lowConf: true },
      ],
    },
    {
      title: "Córners", icon: "📐", confidence: 0.58,
      bets: [
        { label: `Más de ${m.corners_line} córners`, prob: m.prob_corners_over as number ?? 0, note: `${m.hn}: ${(m.corners_avg_home as number)?.toFixed(1)}/p · ${m.an}: ${(m.corners_avg_away as number)?.toFixed(1)}/p`, why: `Línea dinámica calculada: ${m.corners_line} córners. ${m.hn} promedia ${(m.corners_avg_home as number)?.toFixed(1)} y ${m.an} ${(m.corners_avg_away as number)?.toFixed(1)} por partido. Set pieces ${m.hn}: ${m.hsp}% de sus goles.` },
        { label: `${m.hn} +${Math.round((m.hcor as number) - 0.5)} córners`, prob: 0.52, note: `Media histórica ${m.hn}: ${m.hcor}/p · Set pieces: ${m.hsp}% goles`, why: `${m.hn} promedia ${m.hcor} córners/partido con ${m.hsp}% de sus goles mundialistas desde set pieces.` },
      ],
    },
  ];

  function ValueCard({ bet, market }: { bet: Bet; market: string }) {
    const fairO = parseFloat(fairOdds(bet.prob));
    const ev = evVal(bet.prob, fairO);
    const edge = edgeVal(bet.prob, fairO);
    const kelly = kellyStake(bet.prob, fairO, STAKE_USD);
    const hasVal = edge > 0.03 && !bet.lowConf;
    const isHot = edge > 0.07 && !bet.lowConf;

    return (
      <div className={`rounded-xl p-4 transition-all glass-card-hover
        ${isHot ? "border-brand-accent/50 bg-brand-accent/5" :
          hasVal ? "border-brand-success/50 bg-brand-success/5" :
          "border-white/5 bg-white/5"}`}>
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap gap-1.5 mb-2">
              {isHot && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-brand-accent/20 text-brand-accent uppercase tracking-wider animate-pulse">🔥 Fuerte</span>}
              {hasVal && !isHot && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-brand-success/20 text-brand-success uppercase tracking-wider">✓ Valor</span>}
              {bet.lowConf && <span className="text-[9px] font-black px-2 py-0.5 rounded-full bg-brand-danger/20 text-brand-danger uppercase tracking-wider">⚠ Riesgo</span>}
              <span className="text-[9px] px-2 py-0.5 rounded-full bg-brand-surface border border-white/5 text-brand-muted">{market}</span>
            </div>
            <div className="font-bold text-sm text-brand-light">{bet.label}</div>
            <div className="text-[10px] text-brand-muted mt-1">{bet.note}</div>
          </div>
          <div className="text-right flex-shrink-0">
            <div className="font-mono font-black text-2xl leading-none drop-shadow-sm"
              style={{ color: isHot ? "#e9a100" : hasVal ? "#00c896" : "#d4e6ff" }}>
              {toOdds(bet.prob)}
            </div>
            <div className="text-[10px] text-brand-secondary font-medium mt-1">{pct(bet.prob)}</div>
          </div>
        </div>

        {/* Barra de probabilidad */}
        <div className="h-1.5 bg-brand-surface rounded-full mb-4 overflow-hidden shadow-inner">
          <div className="h-full rounded-full transition-all relative"
            style={{ width: `${bet.prob * 100}%`, background: isHot ? "#e9a100" : hasVal ? "#00c896" : "#4895ef" }}>
            <div className="absolute inset-0 bg-white/20 animate-gradient-x"></div>
          </div>
        </div>

        {/* Stats del mercado */}
        <div className="grid grid-cols-4 gap-2 mb-4">
          {[
            ["Prob.", pct(bet.prob), "text-brand-secondary"],
            ["Cuota justa", fairOdds(bet.prob), "text-brand-muted"],
            ["Edge", `${edge > 0 ? "+" : ""}${(edge * 100).toFixed(2)}%`, edge > 0 ? "text-brand-success" : "text-brand-danger"],
            ["EV", cop(ev * STAKE_USD), ev > 0 ? "text-brand-success" : "text-brand-danger"],
          ].map(([l, v, c]) => (
            <div key={l} className="bg-brand-surface/80 rounded-lg p-2 text-center border border-white/5">
              <div className="text-[8px] text-brand-muted mb-1 uppercase tracking-wider">{l}</div>
              <div className={`font-mono font-black text-[10px] ${c}`}>{v}</div>
            </div>
          ))}
        </div>

        {/* Por qué */}
        <div className="text-[11px] text-brand-muted leading-relaxed mb-3 bg-brand-surface/50 p-3 rounded-lg border-l-2 border-brand-secondary/30 italic">
          {bet.why}
        </div>

        {/* Kelly */}
        {hasVal && (
          <div className="bg-gradient-to-r from-brand-success/10 to-transparent border border-brand-success/20 rounded-lg px-3 py-2 text-[11px] text-brand-success flex items-center gap-2">
            <span className="text-base">📐</span>
            <span>
              Kelly ¼: apostar <strong className="text-white">{cop(kelly)}</strong> de tu bankroll
              → ganancia est: <strong className="text-white">{cop(bet.prob * fairO * kelly * 4200)}</strong>
            </span>
          </div>
        )}
      </div>
    );
  }

  return (
    <main className="flex-1 w-full">
      <div className="max-w-5xl mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <div className="flex items-center gap-2 text-xs font-bold text-brand-muted mb-6 bg-white/5 inline-flex px-3 py-1.5 rounded-full">
          <Link href="/" className="hover:text-brand-light transition-colors">Inicio</Link>
          <span className="text-white/20">/</span>
          <Link href={`/grupo/${m.group_code}`} className="hover:text-brand-light transition-colors">Grupo {m.group_code as string}</Link>
          <span className="text-white/20">/</span>
          <span className="text-brand-secondary">{m.hn as string} vs {m.an as string}</span>
        </div>

        {/* ── HEADER DEL PARTIDO ── */}
        <div className="glass-panel rounded-3xl p-6 md:p-10 mb-8 relative overflow-hidden">
          {/* Background decorators */}
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-accent via-brand-secondary to-brand-success opacity-50"></div>
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-brand-accent/10 blur-3xl rounded-full pointer-events-none"></div>
          <div className="absolute -bottom-24 -right-24 w-48 h-48 bg-brand-secondary/10 blur-3xl rounded-full pointer-events-none"></div>

          <div className="text-xs text-brand-muted font-medium text-center mb-8 uppercase tracking-widest relative z-10 bg-brand-surface/50 inline-block mx-auto px-4 py-1.5 rounded-full border border-white/5">
            {dateStr} <span className="mx-2 text-white/20">|</span> {m.venue as string}, {m.city as string}
          </div>

          <div className="grid grid-cols-[1fr_auto_1fr] gap-4 md:gap-8 items-center mb-8 relative z-10">
            {/* Local */}
            <div className="text-center group">
              <div className="text-6xl md:text-7xl mb-4 drop-shadow-lg group-hover:scale-110 transition-transform">{m.hf as string}</div>
              <div className="font-black text-xl md:text-2xl leading-tight">{m.hn as string}</div>
              <div className="text-xs text-brand-muted font-bold mt-1 uppercase tracking-wider">ELO {m.helo as number}</div>
              <div className="flex justify-center gap-1 mt-3">
                {(m.hform as string || "").split("").map((f, i) => (
                  <span key={i} className={`w-5 h-5 rounded-[4px] text-[8px] font-black flex items-center justify-center shadow-sm
                    ${f==="W"?"bg-brand-success text-black":f==="D"?"bg-brand-accent text-black":"bg-brand-danger text-white"}`}>{f}</span>
                ))}
              </div>
              <div className="text-[10px] bg-brand-accent/10 text-brand-accent border border-brand-accent/20 px-2 py-0.5 rounded-full inline-block mt-3">{m.hwc as string}</div>
            </div>

            {/* Centro */}
            <div className="text-center px-2 md:px-8">
              {played ? (
                <div>
                  <div className="text-5xl md:text-6xl font-black font-mono text-gradient drop-shadow-lg leading-none mb-2">
                    {m.score_home as number} - {m.score_away as number}
                  </div>
                  <div className="text-xs font-bold text-brand-success bg-brand-success/10 px-3 py-1 rounded-full inline-block border border-brand-success/20">RESULTADO FINAL</div>
                </div>
              ) : (
                <div>
                  <div className="text-[10px] text-brand-muted font-bold tracking-widest mb-3 uppercase">xG Esperado</div>
                  <div className="flex items-center justify-center gap-3 bg-brand-surface border border-white/10 px-4 py-2 rounded-xl shadow-inner">
                    <div className="font-mono font-black text-3xl text-brand-accent leading-none">{xgH.toFixed(2)}</div>
                    <div className="text-white/20 text-xl font-light">-</div>
                    <div className="font-mono font-black text-3xl text-brand-secondary leading-none">{xgA.toFixed(2)}</div>
                  </div>
                </div>
              )}

              {/* Cuotas 1X2 */}
              <div className="flex justify-center gap-2 mt-6">
                {[
                  [m.prob_home, "1", "text-brand-accent", "bg-brand-accent/5"],
                  [m.prob_draw, "X", "text-brand-light", "bg-white/5"],
                  [m.prob_away, "2", "text-brand-secondary", "bg-brand-secondary/5"],
                ].map(([p, l, c, bg]) => (
                  <div key={l as string} className={`${bg as string} border border-white/10 rounded-xl px-4 py-2 text-center shadow-sm`}>
                    <div className="text-[10px] text-brand-muted font-bold mb-1">{l as string}</div>
                    <div className={`font-mono font-black text-lg leading-tight ${c as string}`}>
                      {toOdds(p as number)}
                    </div>
                    <div className="text-[9px] text-brand-muted mt-0.5">{pct(p as number, 0)}</div>
                  </div>
                ))}
              </div>

              <div className="mt-4 text-[10px] px-3 py-1.5 rounded-full inline-flex items-center gap-2 border" 
                   style={{ background: `${ci.color}10`, color: ci.color, borderColor: `${ci.color}30` }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: ci.color }}></span>
                Confianza: {ci.label}
              </div>
            </div>

            {/* Visitante */}
            <div className="text-center group">
              <div className="text-6xl md:text-7xl mb-4 drop-shadow-lg group-hover:scale-110 transition-transform">{m.af as string}</div>
              <div className="font-black text-xl md:text-2xl leading-tight">{m.an as string}</div>
              <div className="text-xs text-brand-muted font-bold mt-1 uppercase tracking-wider">ELO {m.aelo as number}</div>
              <div className="flex justify-center gap-1 mt-3">
                {(m.aform as string || "").split("").map((f, i) => (
                  <span key={i} className={`w-5 h-5 rounded-[4px] text-[8px] font-black flex items-center justify-center shadow-sm
                    ${f==="W"?"bg-brand-success text-black":f==="D"?"bg-brand-accent text-black":"bg-brand-danger text-white"}`}>{f}</span>
                ))}
              </div>
              <div className="text-[10px] bg-brand-secondary/10 text-brand-secondary border border-brand-secondary/20 px-2 py-0.5 rounded-full inline-block mt-3">{m.awc as string}</div>
            </div>
          </div>

          {/* Comparativa histórica */}
          <div className="border-t border-white/10 pt-6 mt-2">
            <div className="text-[10px] text-brand-muted font-bold tracking-widest text-center mb-4 uppercase">Datos Históricos Comparativos</div>
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
              {[
                ["xG / partido", m.hxg, m.axg],
                ["GS Win Rate", `${m.hstr}`, `${m.astr}`],
                ["Hist. +2.5", `${m.ho25}%`, `${m.ao25}%`],
                ["Hist. BTTS", `${m.hbtts}%`, `${m.abtts}%`],
                ["Córners / p", m.hcor, m.acor],
                ["Goles Balón Parado", `${m.hsp}%`, `${m.asp}%`],
              ].map(([l, h, a]) => (
                <div key={l} className="bg-brand-surface/60 rounded-xl p-3 text-center border border-white/5 shadow-inner">
                  <div className="text-[9px] text-brand-muted mb-2 uppercase tracking-wide font-medium">{l as string}</div>
                  <div className="flex justify-between items-center px-1">
                    <span className="font-mono font-black text-xs text-brand-accent">{h as string}</span>
                    <span className="text-white/20 text-[8px]">vs</span>
                    <span className="font-mono font-black text-xs text-brand-secondary">{a as string}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ── MARCADORES EXACTOS ── */}
        {scores.length > 0 && (
          <div className="mb-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-success/20 flex items-center justify-center text-brand-success">🎯</div>
              <h2 className="text-sm font-bold text-brand-light tracking-widest uppercase">
                Marcadores Más Probables
              </h2>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3">
              {scores.slice(0, 8).map((s, idx) => (
                <div key={s.score}
                  className={`glass-card-hover rounded-xl p-3 text-center ${idx === 0 ? 'border-brand-accent/30 bg-brand-accent/5' : ''}`}>
                  <div className={`font-mono font-black text-xl mb-1 ${idx === 0 ? 'text-gradient' : 'text-brand-light'}`}>{s.score}</div>
                  <div className="text-[11px] font-bold text-brand-secondary">{pct(s.prob)}</div>
                  <div className="text-[10px] text-brand-muted font-mono">{toOdds(s.prob)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── TODOS LOS MERCADOS ── */}
        <div className="flex items-center gap-3 mb-6 mt-12">
          <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center text-white">💰</div>
          <h2 className="text-sm font-bold text-brand-light tracking-widest uppercase">
            Análisis de Mercados y Apuestas de Valor
          </h2>
        </div>

        <div className="space-y-6">
          {markets.map(mkt => {
            const ci2 = confInfo(mkt.confidence);
            return (
              <div key={mkt.title} className="glass-panel rounded-3xl overflow-hidden shadow-lg">
                {/* Header de mercado */}
                <div className="flex items-center gap-4 px-6 py-5 border-b border-white/10 bg-white/[0.02]">
                  <span className="text-2xl drop-shadow-md">{mkt.icon}</span>
                  <div className="flex-1">
                    <div className="font-black text-lg text-brand-light">{mkt.title}</div>
                    <div className="text-[11px] font-medium mt-1 flex items-center gap-1.5" style={{ color: ci2.color }}>
                      <span className="w-1.5 h-1.5 rounded-full" style={{ background: ci2.color }}></span>
                      Confianza del modelo: {ci2.label} ({pct(mkt.confidence, 0)})
                    </div>
                  </div>
                </div>
                {/* Apuestas */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-4 bg-brand-dark/30">
                  {mkt.bets.map(bet => (
                    <ValueCard key={bet.label} bet={bet} market={mkt.title} />
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* ── EVENTOS ── */}
        {events.length > 0 && (
          <div className="mt-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-8 h-8 rounded-lg bg-brand-danger/20 flex items-center justify-center text-brand-danger">⏱️</div>
              <h2 className="text-sm font-bold text-brand-light tracking-widest uppercase">
                Línea de Tiempo del Partido
              </h2>
            </div>
            <div className="glass-panel rounded-3xl p-6">
              <div className="space-y-1 relative before:absolute before:inset-0 before:ml-12 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-brand-accent/20 before:via-brand-secondary/20 before:to-transparent">
                {events.map((e, i) => {
                  const isHome = e.team_flag === m.hf;
                  return (
                    <div key={i} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                      <div className="flex items-center justify-end w-full md:w-1/2 md:group-odd:justify-start gap-4 py-2 px-4 md:px-8">
                        <div className={`flex items-center gap-3 bg-brand-surface border border-white/5 p-3 rounded-xl shadow-md transition-transform group-hover:scale-105 ${isHome ? 'md:flex-row-reverse' : ''}`}>
                          <span className="text-xl drop-shadow-sm flex-shrink-0">{e.team_flag as string}</span>
                          <div className={`flex flex-col ${isHome ? 'md:items-end' : ''}`}>
                            <span className="font-bold text-sm text-brand-light">{e.player_name as string}</span>
                            <span className="text-[10px] text-brand-muted uppercase font-bold tracking-wider">{e.detail as string}</span>
                          </div>
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-inner
                            ${e.type === "Goal" ? "bg-brand-success/20 text-brand-success" : 
                              e.detail === "Yellow Card" ? "bg-brand-accent/20 text-brand-accent" : 
                              e.detail === "Red Card" ? "bg-brand-danger/20 text-brand-danger" : "bg-white/10 text-white"}`}>
                            {e.type === "Goal" ? "⚽" : e.detail === "Yellow Card" ? "🟨" : e.detail === "Red Card" ? "🟥" : "↔️"}
                          </div>
                        </div>
                      </div>
                      
                      {/* Timeline marker */}
                      <div className="absolute left-12 md:left-1/2 w-8 h-8 rounded-full border-4 border-[#06080f] bg-brand-surface flex items-center justify-center transform -translate-x-1/2 shadow-lg z-10">
                        <span className="font-mono text-[10px] font-black text-brand-accent">{e.minute as number}'</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 text-center text-[10px] text-brand-muted border-t border-white/10 pt-6">
          <p className="mb-2">⚠️ Análisis estadístico de entretenimiento. No es asesoría de apuestas. Juega con responsabilidad. +18.</p>
          <p className="font-mono opacity-60">Confianza global del modelo: {pct(conf)} · Torneo generado: {m.generated_at as string}</p>
        </div>
      </div>
    </main>
  );
}
