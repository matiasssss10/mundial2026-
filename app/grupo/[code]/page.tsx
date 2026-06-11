// app/grupo/[code]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";
import { getDb } from "@/lib/db/index";
import { pct, toOdds } from "@/lib/utils";

export const revalidate = 1800;

const GROUPS = "ABCDEFGHIJKL".split("");

export function generateStaticParams() {
  return GROUPS.map(code => ({ code }));
}

export default function GroupPage({ params }: { params: { code: string } }) {
  const code = params.code.toUpperCase();
  if (!GROUPS.includes(code)) notFound();

  const db = getDb();

  const teams = db.prepare(`
    SELECT id, name, flag, elo, form, strength, wc_best, wc_titles,
           xg_avg, xga_avg, cs_pct, btts_pct, o25_pct, corners_avg,
           streak, note
    FROM teams WHERE group_code = ?
    ORDER BY strength DESC
  `).all(code) as Record<string, unknown>[];

  const fixtures = db.prepare(`
    SELECT f.id, f.match_date, f.venue, f.city, f.status,
           f.score_home, f.score_away,
           ht.name hn, ht.flag hf, ht.elo helo,
           at.name an, at.flag af, at.elo aelo,
           p.prob_home, p.prob_draw, p.prob_away,
           p.xg_home, p.xg_away, p.prob_o25, p.prob_btts_yes, p.confidence
    FROM fixtures f
    JOIN teams ht ON f.home_id = ht.id
    JOIN teams at ON f.away_id = at.id
    LEFT JOIN predictions p ON p.fixture_id = f.id
    WHERE f.group_code = ?
    ORDER BY f.match_date ASC
  `).all(code) as Record<string, unknown>[];

  const formColors = (f: string) =>
    (f || "").split("").map(c =>
      c === "W" ? "bg-brand-success text-black" :
      c === "D" ? "bg-brand-accent text-black" : "bg-brand-danger text-white"
    );

  return (
    <main className="flex-1 w-full">
      <div className="max-w-5xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-brand-muted hover:text-brand-light transition-colors mb-6 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full">
          <span>←</span> Volver al Inicio
        </Link>

        <h1 className="text-4xl font-black tracking-tight mb-8">
          <span className="text-gradient">Grupo {code}</span>
        </h1>

        {/* Tabla de clasificación estimada */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 mb-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand-success/20 flex items-center justify-center text-brand-success">📈</div>
            <h2 className="text-xs font-bold text-brand-light tracking-widest uppercase">Clasificación Proyectada</h2>
          </div>
          
          <div className="space-y-2">
            {teams.map((t, i) => {
              const isQ = i < 2;
              const form = (t.form as string) || "DDDDD";
              return (
                <div key={t.id as number}
                  className={`flex flex-col sm:flex-row sm:items-center gap-4 py-4 px-4 rounded-xl transition-colors ${isQ ? 'bg-brand-success/5 border border-brand-success/20' : 'hover:bg-white/5 border border-transparent'}`}>
                  
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-black flex-shrink-0
                      ${isQ ? "bg-gradient-to-br from-brand-success to-emerald-500 text-black shadow-[0_0_15px_rgba(0,200,150,0.4)]" : "bg-brand-surface border border-white/10 text-brand-muted"}`}>
                      {i + 1}
                    </div>
                    <span className="text-3xl drop-shadow-md flex-shrink-0">{t.flag as string}</span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-bold text-lg">{t.name as string}</span>
                        {(t.wc_titles as number) > 0 && (
                          <span className="text-[10px] bg-brand-accent text-black font-black px-2 py-0.5 rounded-full shadow-sm">
                            {t.wc_titles}× 🏆
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="flex gap-1">
                          {form.split("").map((f, fi) => (
                            <span key={fi} className={`w-4 h-4 rounded-[4px] text-[8px] font-black flex items-center justify-center shadow-sm ${formColors(form)[fi]}`}>
                              {f}
                            </span>
                          ))}
                        </div>
                        <span className="text-xs text-brand-muted hidden sm:inline-block">Mejor WC: {t.wc_best as string}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center mt-2 sm:mt-0 pl-12 sm:pl-0">
                    <div className="text-xs text-brand-muted sm:hidden">Fuerza y ELO</div>
                    <div className="text-right">
                      <div className="font-mono font-black text-xl leading-none" style={{ color: isQ ? "#00c896" : "#d4e6ff" }}>
                        {t.strength as number}
                      </div>
                      <div className="text-[10px] text-brand-secondary font-medium mt-1 uppercase tracking-wider">ELO {t.elo as number}</div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
          <div className="mt-6 flex items-center gap-2 px-4 py-3 bg-brand-success/10 border border-brand-success/20 rounded-xl text-xs text-brand-success font-medium">
            <span className="animate-pulse">🟢</span> Los 2 primeros clasifican directo. El mejor 3° de los 12 grupos también puede avanzar.
          </div>
        </div>

        {/* Datos históricos comparativos */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 mb-8 overflow-hidden">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 rounded-lg bg-brand-secondary/20 flex items-center justify-center text-brand-secondary">📊</div>
            <h2 className="text-xs font-bold text-brand-light tracking-widest uppercase">Estadísticas Históricas</h2>
          </div>
          <div className="overflow-x-auto pb-2">
            <table className="w-full text-sm min-w-[600px] border-collapse">
              <thead>
                <tr className="text-brand-muted border-b border-white/10 text-xs tracking-wider uppercase">
                  <th className="text-left pb-4 font-bold">Equipo</th>
                  <th className="text-center pb-4 font-bold">xG/p</th>
                  <th className="text-center pb-4 font-bold">Def/p</th>
                  <th className="text-center pb-4 font-bold">CS%</th>
                  <th className="text-center pb-4 font-bold">BTTS%</th>
                  <th className="text-center pb-4 font-bold">+2.5%</th>
                  <th className="text-center pb-4 font-bold">Córners</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {teams.map(t => (
                  <tr key={t.id as number} className="hover:bg-white/5 transition-colors group">
                    <td className="py-4 font-bold flex items-center gap-2">
                      <span className="text-xl drop-shadow-sm">{t.flag as string}</span> 
                      {t.name as string}
                    </td>
                    <td className="py-4 text-center font-mono font-bold text-brand-accent">{t.xg_avg as number}</td>
                    <td className="py-4 text-center font-mono font-bold text-brand-danger">{t.xga_avg as number}</td>
                    <td className="py-4 text-center font-mono font-bold text-brand-success">{t.cs_pct as number}%</td>
                    <td className="py-4 text-center font-mono font-bold text-brand-light">{t.btts_pct as number}%</td>
                    <td className="py-4 text-center font-mono font-bold text-brand-secondary">{t.o25_pct as number}%</td>
                    <td className="py-4 text-center font-mono font-bold text-brand-light">{t.corners_avg as number}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Partidos */}
        <div className="flex items-center gap-3 mb-6">
          <div className="w-8 h-8 rounded-lg bg-brand-accent/20 flex items-center justify-center text-brand-accent">⚽</div>
          <h2 className="text-xs font-bold text-brand-light tracking-widest uppercase">Partidos del Grupo</h2>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {fixtures.map(m => {
            const played = m.status === "FT";
            return (
              <Link key={m.id as number} href={`/partido/${m.id}`}
                className="block glass-card-hover rounded-2xl p-5 group relative overflow-hidden">
                <div className="absolute top-0 left-0 w-1 h-full bg-gradient-to-b from-brand-accent to-brand-secondary opacity-0 group-hover:opacity-100 transition-opacity"></div>
                
                <div className="flex items-center justify-between text-[10px] text-brand-muted mb-4 font-medium uppercase tracking-wider">
                  <span className="bg-white/5 px-2 py-1 rounded">
                    {new Date(m.match_date as string).toLocaleDateString("es-CO", { weekday:"short", day:"numeric", month:"short", hour:"2-digit", minute:"2-digit" })}
                  </span>
                  <span className="truncate max-w-[120px]">{m.venue as string}</span>
                  {played && <span className="text-brand-success font-black bg-brand-success/10 px-2 py-1 rounded">FINALIZADO</span>}
                </div>
                
                <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4">
                  <div className="text-center">
                    <div className="text-4xl drop-shadow-md mb-2 group-hover:scale-110 transition-transform">{m.hf as string}</div>
                    <div className="font-bold text-sm leading-tight">{m.hn as string}</div>
                    <div className="text-[10px] text-brand-muted mt-1 uppercase">ELO {m.helo as number}</div>
                  </div>
                  
                  <div className="text-center px-2">
                    {played ? (
                      <div className="text-3xl font-black font-mono text-gradient drop-shadow-md">
                        {m.score_home as number} - {m.score_away as number}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center">
                        <div className="flex justify-center gap-1.5 mb-2 bg-brand-dark/50 p-1.5 rounded-lg border border-white/5">
                          {[
                            [m.prob_home, "1", "text-brand-accent"],
                            [m.prob_draw, "X", "text-brand-muted"],
                            [m.prob_away, "2", "text-brand-secondary"],
                          ].map(([p, l, c], i) => (
                            <div key={i} className="text-center px-1">
                              <div className="text-[8px] text-brand-muted font-bold mb-0.5">{l as string}</div>
                              <div className={`font-mono font-black text-sm ${c as string}`}>
                                {toOdds(p as number)}
                              </div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[10px] text-brand-muted font-mono bg-white/5 px-2 py-0.5 rounded-full">
                          xG {(m.xg_home as number)?.toFixed(1)} - {(m.xg_away as number)?.toFixed(1)}
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <div className="text-center">
                    <div className="text-4xl drop-shadow-md mb-2 group-hover:scale-110 transition-transform">{m.af as string}</div>
                    <div className="font-bold text-sm leading-tight">{m.an as string}</div>
                    <div className="text-[10px] text-brand-muted mt-1 uppercase">ELO {m.aelo as number}</div>
                  </div>
                </div>
                
                {!played && m.prob_o25 && (
                  <div className="mt-5 pt-3 border-t border-white/5 flex justify-center gap-6 text-[10px] text-brand-muted font-medium">
                    <span className="flex items-center gap-1">⚽ +2.5 <span className="text-brand-secondary font-bold">{pct(m.prob_o25 as number)}</span></span>
                    <span className="flex items-center gap-1">⚡ BTTS <span className="text-brand-secondary font-bold">{pct(m.prob_btts_yes as number)}</span></span>
                    <span className="flex items-center gap-1">🎯 Conf <span className="text-brand-accent font-bold">{pct(m.confidence as number, 0)}</span></span>
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}
