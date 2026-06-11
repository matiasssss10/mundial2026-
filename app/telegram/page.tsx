"use client";
// app/telegram/page.tsx
// Panel de control de Telegram — configura, prueba y monitorea el bot

import { useState, useEffect } from "react";
import Link from "next/link";

interface BotStatus { ok: boolean; username?: string; error?: string }
interface LogEntry { type: string; status: string; fixture_id: number | null; sent_at: string }

export default function TelegramPage() {
  const [status, setStatus] = useState<BotStatus | null>(null);
  const [logs, setLogs]     = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg]       = useState("");

  useEffect(() => { fetchStatus(); }, []);

  async function fetchStatus() {
    const r = await fetch("/api/telegram?action=status");
    const d = await r.json();
    setStatus(d.bot);
    setLogs(d.logs ?? []);
  }

  async function action(act: string, label: string) {
    setLoading(true); setMsg("");
    const r = await fetch(`/api/telegram?action=${act}`);
    const d = await r.json();
    setMsg(d.ok !== false ? `✅ ${label} completado` : `❌ Error: ${d.error}`);
    setLoading(false);
    await fetchStatus();
  }

  const typeColors: Record<string, string> = {
    preview: "#e9a100", combis: "#00c896", result: "#4895ef",
    daily_summary: "#8b5cf6", test: "#5d82b0",
  };
  const typeLabels: Record<string, string> = {
    preview: "⚽ Previa", combis: "💎 Combinadas", result: "📊 Resultado",
    daily_summary: "🌅 Resumen", test: "🔧 Test",
  };

  return (
    <main className="flex-1 w-full">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <Link href="/" className="inline-flex items-center gap-2 text-xs font-bold text-brand-muted hover:text-brand-light transition-colors mb-6 bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-full">
          <span>←</span> Volver al Inicio
        </Link>

        <div className="flex items-center gap-4 mb-2">
          <div className="w-12 h-12 rounded-2xl bg-[#2AABEE] flex items-center justify-center text-white text-2xl shadow-lg shadow-[#2AABEE]/20">
            📱
          </div>
          <div>
            <h1 className="text-3xl font-black text-gradient tracking-tight">Panel de Telegram</h1>
            <p className="text-sm text-brand-muted mt-0.5">Controla las notificaciones automáticas del bot</p>
          </div>
        </div>

        {/* Estado del bot */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 mt-8 mb-6 relative overflow-hidden">
          <div className="absolute -right-12 -top-12 w-32 h-32 bg-[#2AABEE]/10 blur-3xl rounded-full"></div>
          
          <div className="text-xs font-bold text-brand-light tracking-widest mb-4 flex items-center gap-2 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-secondary"></span> Estado del Bot
          </div>
          
          {status === null ? (
            <div className="flex items-center gap-3 text-sm text-brand-muted">
              <span className="animate-spin text-brand-secondary">↻</span> Verificando conexión...
            </div>
          ) : status.ok ? (
            <div className="flex items-center gap-4 bg-brand-success/5 border border-brand-success/20 p-4 rounded-2xl">
              <div className="w-10 h-10 rounded-full bg-brand-success/20 flex items-center justify-center relative">
                <div className="absolute inset-0 bg-brand-success rounded-full animate-ping opacity-20"></div>
                <div className="w-3 h-3 rounded-full bg-brand-success" />
              </div>
              <div>
                <div className="font-bold text-lg text-brand-success">@{status.username}</div>
                <div className="text-xs text-brand-success/70 mt-0.5">Conectado y funcionando correctamente</div>
              </div>
            </div>
          ) : (
            <div>
              <div className="flex items-center gap-3 mb-4 bg-brand-danger/5 border border-brand-danger/20 p-4 rounded-2xl">
                <div className="w-3 h-3 rounded-full bg-brand-danger shadow-[0_0_10px_rgba(240,64,96,0.5)]" />
                <span className="text-brand-danger font-bold text-lg">No configurado</span>
              </div>
              <div className="bg-brand-surface border border-white/5 rounded-2xl p-5 text-sm relative">
                <div className="absolute top-0 left-0 w-1 h-full bg-brand-accent rounded-l-2xl"></div>
                <p className="text-brand-light font-bold mb-4 flex items-center gap-2">
                  <span>🛠️</span> Guía rápida de configuración:
                </p>
                <ol className="space-y-3 text-brand-muted text-xs">
                  <li className="flex gap-3"><span className="text-brand-secondary font-black">1.</span> <span>Abre Telegram y busca <strong className="text-brand-secondary">@BotFather</strong></span></li>
                  <li className="flex gap-3"><span className="text-brand-secondary font-black">2.</span> <span>Envía <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-brand-light">/newbot</code> y sigue los pasos</span></li>
                  <li className="flex gap-3"><span className="text-brand-secondary font-black">3.</span> <span>Copia el TOKEN que te da BotFather</span></li>
                  <li className="flex gap-3"><span className="text-brand-secondary font-black">4.</span> <span>Obtén tu ID de usuario chateando con <strong className="text-brand-secondary">@userinfobot</strong></span></li>
                  <li className="flex gap-3"><span className="text-brand-secondary font-black">5.</span> <span>Añade lo siguiente al archivo <code className="bg-white/5 border border-white/10 px-1.5 py-0.5 rounded text-brand-light">.env</code>:</span></li>
                </ol>
                <pre className="mt-4 bg-[#04060b] border border-white/5 rounded-xl p-4 text-brand-success text-xs overflow-x-auto shadow-inner">
{`TELEGRAM_BOT_TOKEN="tu_token_aqui"
TELEGRAM_CHAT_ID="tu_chat_id_aqui"
TELEGRAM_CHANNEL_ID="-100123456789"  # opcional para canales
TELEGRAM_PREVIEW_HOURS="2"`}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Acciones */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 mb-6">
          <div className="text-xs font-bold text-brand-light tracking-widest mb-4 flex items-center gap-2 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-accent"></span> Acciones Manuales
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              ["test", "🔧 Test", "Mensaje de prueba", "hover:border-brand-secondary/50 hover:shadow-brand-secondary/20"],
              ["send_previews", "⚽ Previas", "Partidos en próximas 2h", "hover:border-brand-accent/50 hover:shadow-brand-accent/20"],
            ].map(([act, label, desc, hover]) => (
              <button key={act}
                onClick={() => action(act as string, label as string)}
                disabled={loading || !status?.ok}
                className={`glass-card rounded-2xl p-5 text-left transition-all group ${hover} disabled:opacity-40 disabled:cursor-not-allowed`}>
                <div className="font-bold text-sm mb-1 text-brand-light group-hover:text-white transition-colors">{label}</div>
                <div className="text-[11px] text-brand-muted">{desc}</div>
              </button>
            ))}
            <a href="/api/cron"
              className="glass-card rounded-2xl p-5 hover:border-brand-success/50 hover:shadow-brand-success/20 transition-all group">
              <div className="font-bold text-sm mb-1 text-brand-light group-hover:text-white transition-colors">⚡ Forzar Cron</div>
              <div className="text-[11px] text-brand-muted">Ejecuta pipeline completo</div>
            </a>
          </div>
          {msg && (
            <div className={`mt-4 text-sm rounded-xl px-4 py-3 flex items-center gap-2 border ${msg.startsWith("✅") ? "bg-brand-success/10 border-brand-success/20 text-brand-success" : "bg-brand-danger/10 border-brand-danger/20 text-brand-danger"}`}>
              {msg}
            </div>
          )}
        </div>

        {/* Historial */}
        <div className="glass-panel rounded-3xl p-6 md:p-8 mb-6">
          <div className="text-xs font-bold text-brand-light tracking-widest mb-4 flex items-center gap-2 uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-brand-muted"></span> Historial de Mensajes
          </div>
          {logs.length === 0 ? (
            <div className="text-sm text-brand-muted text-center py-8 bg-white/5 rounded-2xl border border-white/5 border-dashed">
              Ningún mensaje enviado recientemente
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map((l, i) => (
                <div key={i} className="flex items-center gap-4 py-2 px-3 bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/10 rounded-xl transition-colors">
                  <span style={{ color: typeColors[l.type] ?? "#5d82b0" }} className="text-xs font-bold w-24 sm:w-32 flex-shrink-0 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: typeColors[l.type] ?? "#5d82b0" }}></span>
                    {typeLabels[l.type] ?? l.type}
                  </span>
                  <span className={`flex items-center justify-center w-5 h-5 rounded-full text-[10px] flex-shrink-0 ${l.status === "ok" ? "bg-brand-success/20 text-brand-success" : "bg-brand-danger/20 text-brand-danger"}`}>
                    {l.status === "ok" ? "✓" : "✗"}
                  </span>
                  {l.fixture_id ? (
                    <span className="text-[10px] bg-brand-surface border border-white/5 px-2 py-0.5 rounded-md text-brand-muted font-mono">ID: {l.fixture_id}</span>
                  ) : <span className="w-12"></span>}
                  <span className="text-[10px] text-brand-muted ml-auto font-mono">{new Date(l.sent_at).toLocaleTimeString('es-CO')}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Automatización Info */}
        <div className="text-[10px] text-brand-muted text-center px-4">
          La automatización está configurada en <code className="text-brand-secondary">vercel.json</code> para ejecutarse a las 06:00 UTC en producción. En local, puedes usar <code className="text-brand-secondary">npx tsx scripts/cron.ts</code>.
        </div>
      </div>
    </main>
  );
}
