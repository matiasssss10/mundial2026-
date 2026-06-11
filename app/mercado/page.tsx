"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function MercadoPage() {
  const [data, setData] = useState<any[]>([]);
  const [prevData, setPrevData] = useState<Record<number, any>>({});

  useEffect(() => {
    const fetchMarket = async () => {
      try {
        const res = await fetch('/api/mercado');
        const json = await res.json();
        if (json.success) {
          setData(current => {
            const newPrev: any = {};
            current.forEach(c => newPrev[c.id] = c);
            setPrevData(newPrev);
            return json.data;
          });
        }
      } catch(e) {}
    };
    
    fetchMarket();
    const interval = setInterval(fetchMarket, 3000); // Polling cada 3 segundos
    return () => clearInterval(interval);
  }, []);

  const getColor = (id: number, field: string, val: string) => {
    if (!prevData[id]) return "text-slate-300";
    const oldVal = parseFloat(prevData[id][field]);
    const newVal = parseFloat(val);
    if (newVal > oldVal) return "text-emerald-400 bg-emerald-500/10 px-1 rounded animate-pulse";
    if (newVal < oldVal) return "text-rose-400 bg-rose-500/10 px-1 rounded animate-pulse";
    return "text-slate-300";
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Bolsa de Valores (Live Odds)
            </h1>
            <p className="text-sm text-slate-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Conexión Directa al Simulador de Mercado
            </p>
          </div>
          <Link href="/">
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-all font-semibold">
              Volver al Dashboard
            </button>
          </Link>
        </div>

        {/* Tabla tipo Bolsa de Valores */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden shadow-2xl">
          <table className="w-full text-left text-sm md:text-base">
            <thead className="bg-slate-950 text-slate-400">
              <tr>
                <th className="px-6 py-4 font-bold uppercase tracking-wider">Partido</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-center">xG</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Local (1)</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Empate (X)</th>
                <th className="px-6 py-4 font-bold uppercase tracking-wider text-right">Visita (2)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800 font-mono">
              {data.map(m => (
                <tr key={m.id} className="hover:bg-slate-800/50 transition-colors group">
                  <td className="px-6 py-4 font-sans font-bold flex items-center gap-3">
                    {m.status === 'LIVE' ? <span className="text-xs bg-rose-500 text-white px-2 py-0.5 rounded-full animate-pulse">LIVE</span> : null}
                    {m.match}
                  </td>
                  <td className="px-6 py-4 text-center text-slate-500">{m.xg}</td>
                  <td className="px-6 py-4 text-right font-black tracking-widest text-lg">
                    <span className={getColor(m.id, 'oddsHome', m.oddsHome)}>{m.oddsHome}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-black tracking-widest text-lg">
                    <span className={getColor(m.id, 'oddsDraw', m.oddsDraw)}>{m.oddsDraw}</span>
                  </td>
                  <td className="px-6 py-4 text-right font-black tracking-widest text-lg">
                    <span className={getColor(m.id, 'oddsAway', m.oddsAway)}>{m.oddsAway}</span>
                  </td>
                </tr>
              ))}
              {data.length === 0 && (
                <tr><td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-sans">Cargando mercado en vivo...</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  );
}
