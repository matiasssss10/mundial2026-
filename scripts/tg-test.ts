// scripts/tg-test.ts
// Asistente de configuración de Telegram — ejecuta: npx tsx scripts/tg-test.ts
import "dotenv/config";
import { testBot, sendTest, buildPreview, send } from "../lib/data/telegram";
import type { MatchData } from "../lib/data/telegram";

async function main() {
  console.log("\n📱 CONFIGURADOR DE TELEGRAM — Mundial 2026 Predictor\n");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n");

  // Verifica variables de entorno
  console.log("🔍 Verificando variables de entorno...");
  const checks = [
    ["TELEGRAM_BOT_TOKEN", process.env.TELEGRAM_BOT_TOKEN],
    ["TELEGRAM_CHAT_ID",   process.env.TELEGRAM_CHAT_ID],
    ["TELEGRAM_CHANNEL_ID", process.env.TELEGRAM_CHANNEL_ID || "(no configurado — opcional)"],
    ["TELEGRAM_PREVIEW_HOURS", process.env.TELEGRAM_PREVIEW_HOURS || "2 (default)"],
  ];
  for (const [key, val] of checks) {
    const configured = val && val !== "pon_tu_token_aqui" && val !== "pon_tu_chat_id";
    console.log(`   ${configured ? "✅" : "❌"} ${key}: ${configured ? "configurado" : "⚠️  NO CONFIGURADO"}`);
  }
  console.log();

  // Test de conexión al bot
  console.log("🤖 Probando conexión al bot...");
  const info = await testBot();
  if (!info.ok) {
    console.log(`   ❌ Error: ${info.error}`);
    console.log("\n   ¿Cómo obtener el token?\n");
    console.log("   1. Abre Telegram");
    console.log("   2. Busca @BotFather");
    console.log("   3. Envía: /newbot");
    console.log("   4. Dale un nombre y un username");
    console.log("   5. Copia el TOKEN y ponlo en .env.local:\n");
    console.log("      TELEGRAM_BOT_TOKEN=tu_token_aqui\n");
    return;
  }
  console.log(`   ✅ Bot conectado: @${info.username}\n`);

  // Enviar mensaje de prueba
  console.log("📤 Enviando mensaje de prueba...");
  const ok = await sendTest();
  console.log(ok ? "   ✅ Mensaje enviado correctamente\n" : "   ❌ Error al enviar\n");

  if (!ok) {
    console.log("   ¿Cómo obtener tu Chat ID?\n");
    console.log("   Opción A: Habla con @userinfobot en Telegram");
    console.log("   Opción B: Inicia tu bot con /start y llama:");
    console.log(`   https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/getUpdates\n`);
    return;
  }

  // Enviar previa de ejemplo
  console.log("⚽ Enviando previa de ejemplo (España vs Argentina)...");
  const example: MatchData = {
    fixtureId: 99999,
    homeTeam: "España",    awayTeam: "Argentina",
    homeFlag: "🇪🇸",       awayFlag: "🇦🇷",
    matchDate: new Date(Date.now() + 7200000).toISOString(),
    venue: "MetLife Stadium", groupCode: "EJEMPLO",
    xgHome: 1.78, xgAway: 1.52,
    probHome: 0.42, probDraw: 0.27, probAway: 0.31,
    probO25: 0.65, probO35: 0.38,
    probBttsY: 0.52, probCsH: 0.28, probCsA: 0.21,
    exactScores: [
      { score: "1-1", prob: 0.108 }, { score: "2-1", prob: 0.095 },
      { score: "1-0", prob: 0.091 }, { score: "2-0", prob: 0.072 },
      { score: "0-1", prob: 0.065 }, { score: "2-2", prob: 0.060 },
    ],
    confidence: 0.71,
    homeElo: 2082, awayElo: 2048,
    homeForm: "WWWWW", awayForm: "WWWDW",
    homeWc: "Campeón 2010", awayWc: "Campeón 2022",
    homeStreak: 12, awayStreak: 36,
    homeO25: 61, awayO25: 62,
    homeBtts: 41, awayBtts: 46,
    bets: [
      { market: "+2.5 goles", selection: "+2.5 goles", prob: 0.65, note: "xG combinado 3.30 — equipos muy ofensivos" },
      { market: "BTTS", selection: "Ambos marcan SÍ", prob: 0.52, note: "España BTTS 41% hist · Argentina 46% hist" },
    ],
  };
  const msg = buildPreview(example);
  const ok2 = await send(msg);
  console.log(ok2 ? "   ✅ Previa de ejemplo enviada\n" : "   ❌ Error al enviar previa\n");

  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("✅ Telegram configurado correctamente");
  console.log("\nEl bot enviará automáticamente:");
  console.log(`  📅 Resumen diario con partidos del día`);
  console.log(`  ⚽ Previa ${process.env.TELEGRAM_PREVIEW_HOURS ?? 2}h antes de cada partido`);
  console.log(`  💎 Combinadas con valor matemático`);
  console.log(`  📊 Resultados al finalizar cada partido`);
  console.log("\nEjecuta el cron diario con:\n   npx tsx scripts/cron.ts\n");
}

main().catch(console.error);
