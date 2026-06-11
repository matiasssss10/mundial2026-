"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function BilleteraPage() {
  const [bankroll, setBankroll] = useState(100000);
  const [history, setHistory] = useState<{ id: number, type: "win"|"loss", amount: number, note: string }[]>([]);
  const [amount, setAmount] = useState(10000);
  const [note, setNote] = useState("");

  useEffect(() => {
    const b = localStorage.getItem("bankroll");
    const h = localStorage.getItem("history");
    if (b) setBankroll(Number(b));
    if (h) setHistory(JSON.parse(h));
  }, []);

  const save = (newBankroll: number, newHistory: any) => {
    setBankroll(newBankroll);
    setHistory(newHistory);
    localStorage.setItem("bankroll", String(newBankroll));
    localStorage.setItem("history", JSON.stringify(newHistory));
  };

  const handleWin = () => {
    const h = [{ id: Date.now(), type: "win" as const, amount, note }, ...history];
    save(bankroll + amount, h);
    setNote("");
  };

  const handleLoss = () => {
    const h = [{ id: Date.now(), type: "loss" as const, amount, note }, ...history];
    save(bankroll - amount, h);
    setNote("");
  };

  const reset = () => {
    if(confirm("¿Reiniciar billetera a $100.000?")) {
      save(100000, []);
    }
  };

  const wins = history.filter(h => h.type === "win").reduce((a, b) => a + b.amount, 0);
  const losses = history.filter(h => h.type === "loss").reduce((a, b) => a + b.amount, 0);
  const roi = ((wins - losses) / 100000) * 100;

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400">
              Bankroll Manager V3
            </h1>
            <p className="text-sm text-slate-400">Control Financiero de Apuestas IA</p>
          </div>
          <Link href="/">
            <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-all font-semibold">
              Volver al Dashboard
            </button>
          </Link>
        </div>

        {/* Top Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col items-center justify-center relative overflow-hidden">
            <div className="absolute top-0 right-0 p-2 opacity-10">🏦</div>
            <p className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-1">Capital Actual</p>
            <p className={`text-4xl font-black ${bankroll >= 100000 ? 'text-emerald-400' : 'text-rose-400'}`}>
              ${bankroll.toLocaleString()}
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col items-center justify-center">
            <p className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-1">Ganancias / Pérdidas</p>
            <p className="text-2xl font-bold text-slate-200">
              <span className="text-emerald-400">+${wins.toLocaleString()}</span> / <span className="text-rose-400">-${losses.toLocaleString()}</span>
            </p>
          </div>
          <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl flex flex-col items-center justify-center">
            <p className="text-sm text-slate-400 uppercase tracking-widest font-bold mb-1">ROI Global</p>
            <p className={`text-3xl font-black ${roi >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
              {roi > 0 ? '+' : ''}{roi.toFixed(1)}%
            </p>
          </div>
        </div>

        {/* Action Panel */}
        <div className="bg-slate-900 border border-slate-800 p-6 rounded-xl">
          <h2 className="text-xl font-bold text-slate-200 mb-4 flex items-center gap-2">
            ⚡ Registrar Apuesta
          </h2>
          <div className="flex flex-col md:flex-row gap-4">
            <input 
              type="number" 
              value={amount}
              onChange={e => setAmount(Number(e.target.value))}
              className="bg-slate-950 border border-slate-800 rounded px-4 py-3 outline-none focus:border-emerald-500 w-full md:w-48 text-lg font-mono"
              placeholder="Monto ($)"
            />
            <input 
              type="text" 
              value={note}
              onChange={e => setNote(e.target.value)}
              className="bg-slate-950 border border-slate-800 rounded px-4 py-3 outline-none focus:border-cyan-500 flex-1"
              placeholder="Nota (Ej: Sencilla Brasil Over 2.5)"
            />
            <button onClick={handleWin} className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/50 hover:bg-emerald-500/30 px-6 py-3 rounded font-bold transition-all">
              ✅ GANADA
            </button>
            <button onClick={handleLoss} className="bg-rose-500/20 text-rose-400 border border-rose-500/50 hover:bg-rose-500/30 px-6 py-3 rounded font-bold transition-all">
              ❌ PERDIDA
            </button>
          </div>
        </div>

        {/* History */}
        <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900/50">
            <h2 className="font-bold text-slate-300">Historial de Transacciones</h2>
            <button onClick={reset} className="text-xs text-rose-400 hover:underline">Reiniciar Billetera</button>
          </div>
          <div className="p-0">
            {history.length === 0 ? (
              <p className="text-slate-500 text-center p-8">No hay transacciones registradas.</p>
            ) : (
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-950 text-slate-400">
                  <tr>
                    <th className="px-6 py-3 font-medium">Fecha</th>
                    <th className="px-6 py-3 font-medium">Nota / Apuesta</th>
                    <th className="px-6 py-3 font-medium text-right">Monto</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {history.map(h => (
                    <tr key={h.id} className="hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4 text-slate-500 whitespace-nowrap">
                        {new Date(h.id).toLocaleString('es-CO')}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {h.note || "Sin nota"}
                      </td>
                      <td className={`px-6 py-4 text-right font-bold ${h.type === 'win' ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {h.type === 'win' ? '+' : '-'}${h.amount.toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
