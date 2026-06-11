import "dotenv/config";
import { getDb } from "../lib/db/index";
import { buildPreview, send } from "../lib/data/telegram";
import { getLineup } from "../lib/data/players";

async function testNotif() {
  console.log("Generando notificación de prueba...");
  const db = getDb();
  
  // Agarrar un partido al azar de México o cualquiera para la prueba
  const match = db.prepare(`
    SELECT f.id,f.match_date,f.venue,f.group_code,
           ht.name hn,ht.flag hf,ht.elo helo,ht.form hform,ht.wc_best hwc,
           ht.streak hstreak,ht.o25_pct ho25,ht.btts_pct hbtts,
           at.name an,at.flag af,at.elo aelo,at.form aform,at.wc_best awc,
           at.streak astreak,at.o25_pct ao25,at.btts_pct abtts,
           p.xg_home,p.xg_away,p.prob_home,p.prob_draw,p.prob_away,
           p.prob_o25,p.prob_btts_yes,p.prob_cs_home,p.prob_cs_away,
           p.prob_o35,p.exact_scores,p.confidence
    FROM fixtures f
    JOIN teams ht ON f.home_id=ht.id
    JOIN teams at ON f.away_id=at.id
    JOIN predictions p ON p.fixture_id=f.id
    WHERE hn = 'México' OR an = 'México' OR hn = 'Brasil' OR hn = 'Argentina'
    LIMIT 1
  `).get() as any;

  if (!match) {
    console.log("No se encontró partido de prueba.");
    return;
  }

  // Modificar la fecha para que parezca que es "hoy"
  match.match_date = new Date().toISOString();

  const data = {
      fixtureId:   match.id as number,
      homeTeam:    match.hn as string,  awayTeam:  match.an as string,
      homeFlag:    match.hf as string,  awayFlag:  match.af as string,
      matchDate:   match.match_date as string,
      venue:       (match.venue as string) ?? "Por confirmar",
      groupCode:   (match.group_code as string) ?? "—",
      xgHome:      (match.xg_home as number)  ?? 1.2,
      xgAway:      (match.xg_away as number)  ?? 1.2,
      probHome:    (match.prob_home as number) ?? 0.33,
      probDraw:    (match.prob_draw as number) ?? 0.33,
      probAway:    (match.prob_away as number) ?? 0.33,
      probO25:     (match.prob_o25 as number)  ?? 0.55,
      probO35:     (match.prob_o35 as number)  ?? 0.35,
      probBttsY:   (match.prob_btts_yes as number) ?? 0.50,
      probCsH:     (match.prob_cs_home as number)  ?? 0.30,
      probCsA:     (match.prob_cs_away as number)  ?? 0.30,
      exactScores: JSON.parse((match.exact_scores as string) ?? "[]"),
      confidence:  (match.confidence as number) ?? 0.6,
      homeElo:     match.helo as number, awayElo:     match.aelo as number,
      homeForm:    match.hform as string, awayForm:   match.aform as string,
      homeWc:      match.hwc as string,  awayWc:     match.awc as string,
      homeStreak:  match.hstreak as number, awayStreak: match.astreak as number,
      homeO25:     match.ho25 as number, awayO25:    match.ao25 as number,
      homeBtts:    match.hbtts as number, awayBtts:  match.abtts as number,
      bets: []
  };

  // Enviar
  const msg = buildPreview(data);
  console.log("Mensaje Generado:\n", msg);
  const ok = await send(msg);
  if (ok) {
    console.log("✅ Notificación enviada exitosamente al celular del usuario.");
  } else {
    console.log("❌ Hubo un error enviando la notificación.");
  }
}

testNotif();
