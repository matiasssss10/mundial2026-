import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute(`
      SELECT f.id, ht.name hn, ht.flag hf, at.name an, at.flag af,
             p.prob_home, p.prob_away, p.prob_draw, p.xg_home, p.xg_away,
             f.status
      FROM fixtures f
      JOIN teams ht ON f.home_id=ht.id
      JOIN teams at ON f.away_id=at.id
      JOIN predictions p ON p.fixture_id=f.id
      ORDER BY f.match_date ASC
    `);
    const rows = result.rows as any[];

    const mkO = (pr: number) => (1 / Math.max(pr, 0.02) * 0.95).toFixed(2);
    
    const marketData = rows.map(r => ({
      id: r.id,
      match: `${r.hf} ${r.hn} vs ${r.af} ${r.an}`,
      status: r.status,
      oddsHome: mkO(r.prob_home),
      oddsDraw: mkO(r.prob_draw),
      oddsAway: mkO(r.prob_away),
      xg: `${(r.xg_home).toFixed(1)} - ${(r.xg_away).toFixed(1)}`
    }));

    return NextResponse.json({ success: true, data: marketData });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
