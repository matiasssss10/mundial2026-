// app/api/telegram/route.ts
// API para gestionar Telegram desde la UI del dashboard
import { NextRequest, NextResponse } from "next/server";
import { testBot, sendTest, sendScheduledPreviews } from "@/lib/data/telegram";
import { getDb } from "@/lib/db/index";

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") ?? "status";

  switch (action) {
    case "status": {
      const info = await testBot();
      const db = getDb();
      const logs = db.prepare(`
        SELECT type, status, fixture_id,
               strftime('%d/%m %H:%M', sent_at) as sent_at
        FROM tg_log ORDER BY sent_at DESC LIMIT 20
      `).all();
      return NextResponse.json({ bot: info, logs });
    }

    case "test": {
      const ok = await sendTest();
      return NextResponse.json({ ok });
    }

    case "send_previews": {
      const n = await sendScheduledPreviews();
      return NextResponse.json({ ok: true, sent: n });
    }

    default:
      return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  }
}
