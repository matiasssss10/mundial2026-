// app/page.tsx
import Link from "next/link";
import { getDb } from "@/lib/db/index";
import { pct, toOdds, cop } from "@/lib/utils";

export const revalidate = 1800;

export default function Home() {
  const db = getDb();

  const sims = db.prepare("SELECT data FROM tournament_sims ORDER BY generated_at DESC LIMIT 1").get() as { data: string } | undefined;
  const top = sims ? (JSON.parse(sims.data) as Record<string,unknown>[]).slice(0, 12) : [];

  const stats = db.prepare(`
    SELECT COUNT(*) total,
           SUM(CASE WHEN status='FT' THEN 1 ELSE 0 END) played,
           SUM(CASE WHEN status='NS' THEN 1 ELSE 0 END) pending
    FROM fixtures
  `).get() as { total: number; played: number; pending: number };

  const upcoming = db.prepare(`
    SELECT f.id,f.match_date,f.group_code,f.venue,
           ht.name hn,ht.flag hf,at.name an,at.flag af,
           p.prob_home,p.prob_draw,p.prob_away,p.xg_home,p.xg_away,p.confidence
    FROM fixtures f
    JOIN teams ht ON f.home_id=ht.id
    JOIN teams at ON f.away_id=at.id
    LEFT JOIN predictions p ON p.fixture_id=f.id
    WHERE f.status='NS'
    ORDER BY f.match_date ASC LIMIT 6
  `).all() as Record<string,unknown>[];

  const progress = stats.total > 0 ? stats.played / stats.total : 0;

  return (
    <main className="flex-1 w-full">
      {/* Banner */}
      <div className="bg-brand-surface/80 backdrop-blur-md border-b border-white/5 px-4 py-2 text-[10px] sm:text-xs text-center text-brand-muted tracking-wide">
        ⚠️ Análisis estadístico de entretenimiento · No es asesoría de apuestas · +18
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="mb-12 text-center md:text-left flex flex-col md:flex-row md:items-end justify-between gap-4 relative z-10">
          <div>
            <div className="flex gap-4 mb-4">
              <div className="flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded-full border border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.2)]">
                <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
                <span className="text-sm font-bold tracking-wide">CACHÉ LRU ACTIVO: 1ms</span>
              </div>
              <a href="/mercado" className="flex items-center gap-2 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-all px-4 py-1.5 rounded-full border border-purple-500/30 cursor-pointer">
                <span>📈 Mercado en Vivo</span>
              </a>
              <a href="/bracket" className="flex items-center gap-2 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-all px-4 py-1.5 rounded-full border border-amber-500/30 cursor-pointer">
                <span>🏆 Árbol Predictivo</span>
              </a>
              <a href="/billetera" className="flex items-center gap-2 bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-all px-4 py-1.5 rounded-full border border-cyan-500/30 cursor-pointer">
                <span>🏦 Billetera / ROI</span>
              </a>
            </div>
            <h1 className="text-4xl md:text-6xl font-black tracking-tight mb-2">
              <span className="text-gradient">Mundial 2026</span> IA
            </h1>
            <p className="text-sm md:text-base text-brand-muted max-w-2xl mt-4 leading-relaxed">
              Sistema predictivo de auto-aprendizaje. Poisson paramétrico + Decadencia en Vivo + Monte Carlo.
            </p>
          </div>
          <div className="glass-panel px-6 py-3 rounded-2xl flex flex-col items-center gap-1 shadow-2xl border-brand-secondary/30">
            <span className="text-xs text-brand-muted font-bold uppercase tracking-widest">Estado Servidor</span>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-brand-success animate-ping"></span>
              <span className="font-mono text-sm text-brand-light">Caché LRU 1ms</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 relative z-10">
          {/* Main Column */}
          <div className="lg:col-span-2 space-y-8">
            {/* Proyección de campeón */}
            <section>
              <div className="flex items-center gap-3 mb-6">
                <div className="w-8 h-8 rounded-lg bg-brand-accent/20 flex items-center justify-center text-brand-accent">🏆</div>
                <h2 className="text-sm font-bold text-brand-light tracking-widest uppercase">
                  Favoritos al Título
                </h2>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {top.map((t, i) => {
                  const p = t.probChampion as number;
                  const medal = ["🥇","🥈","🥉"][i] ?? `${i+1}.`;
                  return (
                    <div key={t.teamId as number} className="glass-card-hover rounded-2xl p-4 flex items-center gap-4">
                      <div className="w-8 h-8 rounded-full bg-brand-surface border border-white/5 flex items-center justify-center text-sm shadow-inner">
                        {medal}
                      </div>
                      <span className="text-2xl drop-shadow-md">{t.flag as string}</span>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-end mb-1.5">
                          <span className="font-bold text-base truncate">{t.name as string}</span>
                          <span className="font-mono font-black text-brand-accent">{pct(p)}</span>
                        </div>
                        <div className="h-1.5 bg-brand-surface rounded-full overflow-hidden shadow-inner">
                          <div className="h-full bg-gradient-to-r from-brand-accent to-yellow-300 rounded-full relative" 
                               style={{ width: `${Math.min(p * 500, 100)}%` }}>
                            <div className="absolute inset-0 bg-white/20 animate-gradient-x"></div>
                          </div>
                        </div>
                        <div className="flex justify-between mt-2 text-[10px] text-brand-muted font-medium">
                          <span>Final: {pct(t.probFinal as number, 0)}</span>
                          <span>Semi: {pct(t.probSemi as number, 0)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* Grupos */}
            <section>
              <div className="flex items-center gap-3 mb-6 mt-12">
                <div className="w-8 h-8 rounded-lg bg-brand-secondary/20 flex items-center justify-center text-brand-secondary">📊</div>
                <h2 className="text-sm font-bold text-brand-light tracking-widest uppercase">Grupos</h2>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {"ABCDEFGHIJKL".split("").map(g => (
                  <Link key={g} href={`/grupo/${g}`}
                    className="glass-card-hover rounded-xl p-4 text-center group">
                    <div className="text-2xl font-black text-gradient group-hover:scale-110 transition-transform">G{g}</div>
                    <div className="text-xs text-brand-muted mt-2 font-medium">Ver detalles →</div>
                  </Link>
                ))}
              </div>
            </section>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Telegram */}
            <Link href="/telegram" className="block relative overflow-hidden glass-card rounded-2xl p-6 border-brand-secondary/30 hover:border-brand-secondary hover:shadow-[0_0_30px_-5px_rgba(72,149,239,0.3)] hover:-translate-y-1 transition-all group">
              <div className="absolute -right-6 -top-6 w-24 h-24 bg-brand-secondary/20 blur-2xl rounded-full group-hover:bg-brand-secondary/40 transition-colors"></div>
              <div className="flex items-center gap-3 mb-3 relative z-10">
                <div className="w-10 h-10 rounded-full bg-[#2AABEE] flex items-center justify-center text-white shadow-lg">📱</div>
                <div className="text-sm font-bold text-brand-light tracking-widest uppercase">Bot Telegram</div>
              </div>
              <p className="text-sm text-brand-muted relative z-10 leading-relaxed mb-4">
                Recibe alertas de pronósticos, apuestas de valor y resúmenes diarios directamente en tu móvil.
              </p>
              <div className="inline-flex items-center text-xs font-bold text-brand-secondary group-hover:text-white transition-colors relative z-10">
                Configurar notificaciones <span className="ml-1 group-hover:translate-x-1 transition-transform">→</span>
              </div>
            </Link>

            {/* Progreso */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-xs font-bold text-brand-muted tracking-widest mb-4 uppercase">Progreso del Torneo</h3>
              <div className="grid grid-cols-3 gap-2 text-center mb-4">
                {[["Total", stats.total, "text-brand-muted"],["Jugados", stats.played, "text-brand-success"],["Pendientes", stats.pending, "text-brand-accent"]].map(([l,v,c]) => (
                  <div key={l as string} className="bg-brand-dark/50 rounded-lg py-2">
                    <div className={`text-xl font-black font-mono ${c as string}`}>{v as number}</div>
                    <div className="text-[10px] text-brand-muted mt-0.5 uppercase">{l as string}</div>
                  </div>
                ))}
              </div>
              <div className="h-2 bg-brand-dark rounded-full overflow-hidden shadow-inner">
                <div className="h-full bg-gradient-to-r from-brand-success to-emerald-400 rounded-full transition-all relative" 
                     style={{ width: `${progress * 100}%` }}>
                  <div className="absolute inset-0 bg-white/20 animate-gradient-x"></div>
                </div>
              </div>
            </div>

            {/* Próximos partidos */}
            <div className="glass-panel rounded-2xl p-6">
              <h3 className="text-xs font-bold text-brand-muted tracking-widest mb-4 uppercase">Próximos Partidos</h3>
              <div className="space-y-3">
                {upcoming.map(m => (
                  <Link key={m.id as number} href={`/partido/${m.id}`}
                    className="block bg-brand-dark/40 border border-white/5 rounded-xl p-3 hover:bg-brand-dark/80 hover:border-brand-accent/30 transition-all">
                    <div className="flex justify-between items-center text-[10px] text-brand-muted mb-2 font-medium">
                      <span className="bg-white/5 px-2 py-0.5 rounded text-brand-light">Gr. {m.group_code as string}</span>
                      <span>{new Date(m.match_date as string).toLocaleDateString("es-CO", { month:"short", day:"numeric", hour:"2-digit", minute:"2-digit" })}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs font-bold">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        <span className="text-lg drop-shadow-sm">{m.hf as string}</span>
                        <span className="truncate">{m.hn as string}</span>
                      </div>
                      <div className="flex items-center gap-2 px-2">
                        <span className="font-mono text-brand-accent">{toOdds(m.prob_home as number)}</span>
                        <span className="text-brand-muted font-normal text-[10px]">vs</span>
                        <span className="font-mono text-brand-secondary">{toOdds(m.prob_away as number)}</span>
                      </div>
                      <div className="flex items-center gap-2 flex-1 min-w-0 justify-end">
                        <span className="truncate">{m.an as string}</span>
                        <span className="text-lg drop-shadow-sm">{m.af as string}</span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
              <Link href="/grupo/A" className="block text-center text-xs text-brand-secondary hover:text-brand-light mt-4 transition-colors">
                Ver todos los partidos →
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
