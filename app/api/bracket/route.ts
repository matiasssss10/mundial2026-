import { NextResponse } from 'next/server';
import { getDb } from '@/lib/db/index';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const db = await getDb();
    const result = await db.execute(`SELECT data FROM tournament_sims ORDER BY id DESC LIMIT 1`);
    const row = result.rows[0] as any;
    if (!row) {
      return NextResponse.json({ success: true, data: {} });
    }

    const sims = JSON.parse(row.data);
    
    // Convertir el JSON de simulaciones en un array ordenado por probabilidad de llegar a la final
    const teams = Object.values(sims).sort((a: any, b: any) => (b.final - a.final));
    
    // Construir un bracket falso pero matemáticamente sustentado por las probabilidades
    // Para simplificar la visualización de Octavos (16 equipos)
    const top16 = teams.slice(0, 16);
    
    return NextResponse.json({ success: true, data: top16 });
  } catch (e: any) {
    return NextResponse.json({ success: false, error: e.message }, { status: 500 });
  }
}
