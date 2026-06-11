// app/api/cron/route.ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db/index";
import { predict } from "@/lib/model/poisson";
import { predictCards, predictCorners } from "@/lib/model/derived";
import { sendScheduledPreviews } from "@/lib/data/telegram";

export async function GET(req: Request) {
  // Protección en producción
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${secret}`)
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = await getDb();
  let predictions = 0;

  try {
    const pendingRes = await db.execute(`
      SELECT f.id,
             ht.xg_avg hxg,ht.xga_avg hxga,ht.elo helo,ht.form hform,ht.sede_bonus hsede,
             ht.corners_avg hcor,ht.cards_avg hcards,
             at.xg_avg axg,at.xga_avg axga,at.elo aelo,at.form aform,at.sede_bonus asede,
             at.corners_avg acor,at.cards_avg acards
      FROM fixtures f
      JOIN teams ht ON f.home_id=ht.id
      JOIN teams at ON f.away_id=at.id
      WHERE f.status='NS'
    `);
    const pending = pendingRes.rows as any[];

    for (const f of pending) {
      const p = predict(
        { xgAvg: f.hxg as number, xgaAvg: f.hxga as number, elo: f.helo as number, form: f.hform as string, sede: f.hsede as number },
        { xgAvg: f.axg as number, xgaAvg: f.axga as number, elo: f.aelo as number, form: f.aform as string, sede: f.asede as number }
      );
      const cards = predictCards({ avgHome: f.hcards as number ?? 3.5, avgAway: f.acards as number ?? 3.5, eloDiff: Math.abs((f.helo as number) - (f.aelo as number)) });
      const corn  = predictCorners({ avgHome: f.hcor as number ?? 5, avgAway: f.acor as number ?? 5, eloDiff: Math.abs((f.helo as number) - (f.aelo as number)) });
      
      await db.execute({
        sql: `INSERT INTO predictions
        (fixture_id,xg_home,xg_away,prob_home,prob_draw,prob_away,
         prob_o25,prob_o35,prob_btts_yes,prob_btts_no,
         exact_scores,prob_cs_home,prob_cs_away,
         cards_avg_home,cards_avg_away,prob_cards_o35,
         corners_avg_home,corners_avg_away,corners_line,prob_corners_over,confidence)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
      ON CONFLICT(fixture_id) DO UPDATE SET
        xg_home=excluded.xg_home, prob_home=excluded.prob_home,
        prob_o25=excluded.prob_o25, prob_btts_yes=excluded.prob_btts_yes,
        exact_scores=excluded.exact_scores, confidence=excluded.confidence,
        generated_at=datetime('now')`,
        args: [f.id, p.xgHome, p.xgAway, p.probHome, p.probDraw, p.probAway,
          p.probO25, p.probO35, p.probBttsY, p.probBttsN,
          JSON.stringify(p.exactScores), p.probCsH, p.probCsA,
          cards.avgHome, cards.avgAway, cards.probO35,
          corn.avgHome, corn.avgAway, corn.line, corn.probOver, p.confidence]
      });
    }
    predictions = pending.length;

    const sent = await sendScheduledPreviews();
    return NextResponse.json({ ok: true, predictions, telegramPreviews: sent, ts: new Date().toISOString() });
  } catch (e: unknown) {
    return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 500 });
  }
}
