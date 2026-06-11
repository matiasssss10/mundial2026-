"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

export default function BracketPage() {
  const [teams, setTeams] = useState<any[]>([]);

  useEffect(() => {
    const fetchBracket = async () => {
      try {
        const res = await fetch('/api/bracket');
        const json = await res.json();
        if (json.success && json.data.length >= 16) {
          setTeams(json.data);
        }
      } catch(e) {}
    };
    fetchBracket();
  }, []);

  const renderMatch = (teamA: any, teamB: any, round: string) => {
    if (!teamA || !teamB) return <div className="h-16 w-48 bg-slate-800/20 border border-slate-800/50 rounded-lg"></div>;
    
    const total = teamA[round] + teamB[round];
    const probA = (teamA[round] / total * 100).toFixed(1);
    const probB = (teamB[round] / total * 100).toFixed(1);
    
    return (
      <div className="flex flex-col justify-center h-20 w-56 bg-slate-900 border border-slate-700 shadow-2xl rounded-lg overflow-hidden transition-all hover:scale-105 z-10 relative">
        <div className={`flex justify-between px-3 py-1.5 ${probA > probB ? 'bg-emerald-500/10' : ''}`}>
          <div className="flex items-center gap-2">
            <span>{teamA.flag}</span>
            <span className={`font-bold ${probA > probB ? 'text-white' : 'text-slate-400'}`}>{teamA.name}</span>
          </div>
          <span className={`text-xs font-mono font-black ${probA > probB ? 'text-emerald-400' : 'text-slate-500'}`}>{probA}%</span>
        </div>
        <div className="w-full h-px bg-slate-800"></div>
        <div className={`flex justify-between px-3 py-1.5 ${probB > probA ? 'bg-emerald-500/10' : ''}`}>
          <div className="flex items-center gap-2">
            <span>{teamB.flag}</span>
            <span className={`font-bold ${probB > probA ? 'text-white' : 'text-slate-400'}`}>{teamB.name}</span>
          </div>
          <span className={`text-xs font-mono font-black ${probB > probA ? 'text-emerald-400' : 'text-slate-500'}`}>{probB}%</span>
        </div>
      </div>
    );
  };

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 font-sans p-6 overflow-x-auto">
      <div className="min-w-[1200px] mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-400 flex items-center gap-2">
              <span className="text-3xl">🏆</span> Árbol Predictivo Mundial 2026
            </h1>
            <p className="text-sm text-slate-400">Ruta más probable basada en 10.000 simulaciones de Machine Learning</p>
          </div>
          <div className="flex gap-4">
            <Link href="/mercado">
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-all font-semibold">
                📈 Bolsa de Valores
              </button>
            </Link>
            <Link href="/">
              <button className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-all font-semibold">
                Volver
              </button>
            </Link>
          </div>
        </div>

        {/* Bracket UI */}
        {teams.length < 16 ? (
          <div className="text-center p-20 text-slate-500 animate-pulse">Generando Simulaciones del Árbol...</div>
        ) : (
          <div className="flex justify-between items-center py-10 relative">
            
            {/* SVG Lines (Background) */}
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 0 }}>
              {/* Left Side Lines */}
              <path d="M 224 150 L 260 150 L 260 210 L 300 210" fill="none" stroke="#334155" strokeWidth="2" />
              <path d="M 224 270 L 260 270 L 260 210" fill="none" stroke="#334155" strokeWidth="2" />
              <path d="M 224 390 L 260 390 L 260 450 L 300 450" fill="none" stroke="#334155" strokeWidth="2" />
              <path d="M 224 510 L 260 510 L 260 450" fill="none" stroke="#334155" strokeWidth="2" />
              
              <path d="M 524 210 L 560 210 L 560 330 L 600 330" fill="none" stroke="#334155" strokeWidth="2" />
              <path d="M 524 450 L 560 450 L 560 330" fill="none" stroke="#334155" strokeWidth="2" />
              
              {/* Right Side Lines */}
              <path d="M 976 150 L 940 150 L 940 210 L 900 210" fill="none" stroke="#334155" strokeWidth="2" />
              <path d="M 976 270 L 940 270 L 940 210" fill="none" stroke="#334155" strokeWidth="2" />
              <path d="M 976 390 L 940 390 L 940 450 L 900 450" fill="none" stroke="#334155" strokeWidth="2" />
              <path d="M 976 510 L 940 510 L 940 450" fill="none" stroke="#334155" strokeWidth="2" />
              
              <path d="M 676 210 L 640 210 L 640 330 L 600 330" fill="none" stroke="#334155" strokeWidth="2" />
              <path d="M 676 450 L 640 450 L 640 330" fill="none" stroke="#334155" strokeWidth="2" />
            </svg>

            {/* Left Column (Octavos) */}
            <div className="flex flex-col gap-10">
              <h2 className="text-center font-bold text-slate-500 tracking-widest uppercase text-xs mb-2">Octavos de Final</h2>
              {renderMatch(teams[0], teams[15], 'r16')}
              {renderMatch(teams[7], teams[8], 'r16')}
              {renderMatch(teams[3], teams[12], 'r16')}
              {renderMatch(teams[4], teams[11], 'r16')}
            </div>

            {/* Left Mid Column (Cuartos) */}
            <div className="flex flex-col gap-[120px]">
              <h2 className="text-center font-bold text-slate-500 tracking-widest uppercase text-xs mb-[-100px]">Cuartos de Final</h2>
              {renderMatch(teams[0], teams[7], 'qf')}
              {renderMatch(teams[3], teams[4], 'qf')}
            </div>

            {/* Center (Final & Semis) */}
            <div className="flex flex-col justify-center items-center gap-[200px]">
              <h2 className="text-center font-bold text-amber-500 tracking-widest uppercase text-sm absolute top-4">🏆 GRAN FINAL 🏆</h2>
              {renderMatch(teams[0], teams[1], 'final')}
            </div>

            {/* Right Mid Column (Cuartos) */}
            <div className="flex flex-col gap-[120px]">
              <h2 className="text-center font-bold text-slate-500 tracking-widest uppercase text-xs mb-[-100px]">Cuartos de Final</h2>
              {renderMatch(teams[1], teams[6], 'qf')}
              {renderMatch(teams[2], teams[5], 'qf')}
            </div>

            {/* Right Column (Octavos) */}
            <div className="flex flex-col gap-10">
              <h2 className="text-center font-bold text-slate-500 tracking-widest uppercase text-xs mb-2">Octavos de Final</h2>
              {renderMatch(teams[1], teams[14], 'r16')}
              {renderMatch(teams[6], teams[9], 'r16')}
              {renderMatch(teams[2], teams[13], 'r16')}
              {renderMatch(teams[5], teams[10], 'r16')}
            </div>

          </div>
        )}
      </div>
    </main>
  );
}
