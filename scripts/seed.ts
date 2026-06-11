// scripts/seed.ts
import "dotenv/config";
import { getDb } from "../lib/db/index";

const db = getDb();

// ─── 48 equipos del Mundial 2026 ────────────────────────────────
const TEAMS = [
  // id,name,short,flag,group,conf,rank,elo,xg,xga,cs,btts,o25,cor,cards,sp,form,streak,sede,wc_titles,wc_best,str,note
  [901,"México","MEX","🇲🇽","A","CONCACAF",15,1898,1.52,1.20,38,54,58,5.2,3.8,25,"WDWWW",3,0.15,0,"QF 1986",72,"Co-anfitrión: +15% adj sede. 17 mundiales. Siempre eliminado en R16."],
  [902,"Corea del Sur","KOR","🇰🇷","A","AFC",22,1820,1.42,1.15,37,54,55,5.0,3.5,22,"WWDWW",3,0.02,0,"SF 2002",66,"En 2022 eliminó a Uruguay. Pressing 88/100."],
  [903,"Sudáfrica","RSA","🇿🇦","A","CAF",62,1782,1.20,1.30,32,57,52,4.6,3.6,21,"WWDWW",3,0.02,0,"GS 2010",48,"Como local en 2010 no pasó grupos."],
  [904,"Chequia","CZE","🇨🇿","A","UEFA",44,1842,1.35,1.10,40,48,57,5.0,3.4,27,"WWWWW",5,0.02,0,"QF 1962",59,"Rica historia como Checoslovaquia: 2 finales mundiales."],
  [905,"Canadá","CAN","🇨🇦","B","CONCACAF",25,1825,1.40,1.10,39,51,56,5.4,3.5,23,"WWWWW",6,0.12,0,"GS 2022",61,"Co-anfitrión. Primera sede. Presión local positiva."],
  [906,"Bosnia-Herz.","BIH","🇧🇦","B","UEFA",65,1778,1.30,1.30,30,58,54,4.8,3.7,22,"WWDWW",3,0.02,0,"GS 2014",51,"Segundo mundial en su historia."],
  [907,"Qatar","QAT","🇶🇦","B","AFC",58,1755,1.10,1.45,27,58,49,4.3,3.8,20,"WDLWW",2,0.02,0,"GS 2022",42,"Primer anfitrión eliminado en grupos históricamente."],
  [908,"Suiza","SUI","🇨🇭","B","UEFA",19,1862,1.62,1.00,44,47,59,5.5,3.3,31,"WWWDW",5,0.02,0,"QF 2022",75,"12 mundiales clasificados. Alta regularidad táctica."],
  [909,"Brasil","BRA","🇧🇷","C","CONMEBOL",5,2018,2.05,0.75,55,40,63,6.0,3.2,22,"WWWWW",7,0.02,5,"Campeón 2002",88,"Mayor cantidad de victorias en fase de grupos: 80%."],
  [910,"Marruecos","MAR","🇲🇦","C","CAF",14,1918,1.35,0.70,58,35,45,4.8,3.1,38,"WWWWW",14,0.04,0,"SF 2022",76,"Qatar 2022: 5 clean sheets en 7 partidos. Set pieces 38%."],
  [911,"Escocia","SCO","🏴󠁧󠁢󠁳󠁣󠁴󠁿","C","UEFA",38,1808,1.35,1.15,38,51,56,5.2,3.5,26,"WWDWW",4,0.02,0,"GS (7×)",50,"7 mundiales, nunca pasó de grupos. Regresa tras 28 años."],
  [912,"Haití","HAI","🇭🇹","C","CONCACAF",90,1710,0.90,1.60,20,60,45,3.8,4.2,16,"LLLWL",0,0.01,0,"GS 1974",25,"Regresa al Mundial 52 años después."],
  [913,"EE.UU.","USA","🇺🇸","D","CONCACAF",16,1895,1.58,1.15,39,52,57,5.6,3.6,29,"WWDWW",4,0.14,0,"QF 2002",73,"Co-anfitrión. Pressing alto. Jóvenes talentos."],
  [914,"Turquía","TUR","🇹🇷","D","UEFA",13,1922,1.68,1.10,40,50,61,5.8,3.8,26,"WWWWW",7,0.03,0,"3° 2002",70,"EURO 2024 hasta SF. Gran forma reciente."],
  [915,"Australia","AUS","🇦🇺","D","AFC",24,1815,1.38,1.20,36,55,54,4.9,3.5,24,"WWDWW",3,0.02,0,"R16 2022",67,"En Qatar 2022 llegó a QF. Mejor generación en 20 años."],
  [916,"Paraguay","PAR","🇵🇾","D","CONMEBOL",60,1795,1.20,1.30,32,57,52,4.5,3.9,20,"WDWLW",2,0.02,0,"QF 2010",57,"Penaltis en 2010 QF. Defensivos y físicos."],
  [917,"Alemania","GER","🇩🇪","E","UEFA",9,1968,1.82,1.00,44,48,66,6.1,3.4,33,"WWWDW",5,0.04,4,"Campeón 2014",82,"Penaltis 73% histórico. Siempre presentes en fases finales."],
  [918,"Ecuador","ECU","🇪🇨","E","CONMEBOL",20,1848,1.48,1.20,37,55,56,4.8,3.6,24,"WWDWW",4,0.02,0,"R16 2006",68,"Abrió Qatar 2022 con gol a los 16 min vs anfitrión."],
  [919,"Costa de Marfil","CIV","🇨🇮","E","CAF",50,1840,1.38,1.20,35,54,55,4.9,3.7,23,"WWWWW",6,0.02,0,"GS 2006-14",65,"AFCON 2015. Siempre competitivos pero sale en grupos."],
  [920,"Curazao","CUW","🇨🇼","E","CONCACAF",85,1695,0.95,1.50,22,61,46,4.0,4.0,17,"WLWDL",1,0.01,0,"Debut 2026",33,"Debut absoluto en un Mundial."],
  [921,"Países Bajos","NED","🇳🇱","F","UEFA",7,1998,1.85,0.90,46,47,65,6.3,3.5,30,"WWDWW",6,0.03,0,"Final 2010",86,"Mayor % +2.5 de UEFA (65%). Juego ofensivo siempre."],
  [922,"Japón","JPN","🇯🇵","F","AFC",17,1882,1.45,1.20,38,53,55,5.4,3.3,22,"WWWDW",5,0.02,0,"R16 2022",77,"En Qatar 2022 eliminó a España y Alemania. Pressing 88/100."],
  [923,"Suecia","SWE","🇸🇪","F","UEFA",26,1838,1.45,1.10,40,49,57,5.1,3.4,27,"WWDWW",4,0.02,0,"SF 1994",62,"SF 1994 y QF 2018. Historia respetable."],
  [924,"Túnez","TUN","🇹🇳","F","CAF",40,1802,1.20,1.25,33,55,51,4.6,3.6,21,"WWDWW",3,0.02,0,"GS (6×)",53,"6 mundiales seguidos eliminado en grupos. Patrón preocupante."],
  [925,"Bélgica","BEL","🇧🇪","G","UEFA",8,1975,1.75,1.00,43,49,63,5.7,3.5,29,"WWDWW",4,0.02,0,"3° 2018",83,"Generación dorada en declive. BTTS en 49%."],
  [926,"Egipto","EGY","🇪🇬","G","CAF",45,1818,1.25,1.20,35,52,52,4.7,3.5,22,"WWWDW",4,0.02,0,"GS 1990",54,"7 AFCON. Salah es la clave. Solo 3 mundiales históricos."],
  [927,"Irán","IRN","🇮🇷","G","AFC",35,1828,1.30,1.15,37,50,53,4.9,3.6,24,"WWWWW",6,0.02,0,"GS (6×)",55,"En Qatar 2022 casi elimina a EE.UU. Defensivos."],
  [928,"Nueva Zelanda","NZL","🇳🇿","G","OFC",80,1705,0.95,1.45,24,60,47,4.1,3.4,18,"WWDLW",2,0.01,0,"GS 2010",37,"3 mundiales históricos. Poca experiencia a este nivel."],
  [929,"España","ESP","🇪🇸","H","UEFA",1,2082,2.10,0.70,52,41,61,6.2,3.1,28,"WWWWW",12,0.05,1,"Campeón 2010",95,"Mayor xG del torneo. Pressing 88. Domina equipos CONCACAF."],
  [930,"Uruguay","URU","🇺🇾","H","CONMEBOL",11,1938,1.60,1.00,42,50,58,5.0,3.6,30,"WWDWW",5,0.03,2,"Campeón 1950",78,"42% clean sheet histórico. Estilo físico y disciplinado."],
  [931,"Arabia Saudita","KSA","🇸🇦","H","AFC",57,1808,1.15,1.35,29,57,50,4.4,3.7,21,"WWWWW",5,0.02,0,"R16 2022",52,"En Qatar 2022 eliminó a Argentina en GS. Impredecibles."],
  [932,"Cabo Verde","CPV","🇨🇻","H","CAF",75,1742,1.05,1.40,26,59,47,4.2,3.8,19,"WWDWW",4,0.01,0,"Debut 2026",45,"Primera vez en un Mundial. Revelación AFCON."],
  [933,"Francia","FRA","🇫🇷","I","UEFA",2,2054,1.95,0.90,48,44,58,5.8,3.2,31,"WWDWW",9,0.03,2,"Campeón 2018",93,"Mbappé +0.3 xG. 71% win rate en fases finales."],
  [934,"Senegal","SEN","🇸🇳","I","CAF",18,1875,1.42,1.10,41,48,54,4.9,3.5,27,"WWDWW",6,0.03,0,"QF 2002",74,"Campeón AFCON 2022. Mané factor clave."],
  [935,"Noruega","NOR","🇳🇴","I","UEFA",23,1842,1.70,1.15,38,52,60,5.3,3.5,25,"WWWWW",9,0.02,0,"QF 1938",70,"Haaland: mayor amenaza aérea del torneo. Vuelve tras 28 años."],
  [936,"Irak","IRQ","🇮🇶","I","AFC",88,1695,0.90,1.55,21,62,44,3.9,4.1,17,"WDLWL",1,0.01,0,"GS 1986",30,"Regresa al Mundial tras 40 años."],
  [937,"Argentina","ARG","🇦🇷","J","CONMEBOL",3,2048,1.88,0.85,50,46,62,5.5,3.3,24,"WWWDW",36,0.04,3,"Campeón 2022",92,"Penaltis 80% efectividad. Racha 36 invictos. Messi."],
  [938,"Austria","AUT","🇦🇹","J","UEFA",21,1812,1.55,1.05,42,48,58,5.5,3.4,26,"WWWWW",8,0.02,0,"3° 1954",64,"Gran EURO 2024 SF. Regresa al Mundial tras 28 años."],
  [939,"Argelia","ALG","🇩🇿","J","CAF",48,1845,1.25,1.20,34,53,52,4.8,3.6,22,"WWWWW",6,0.02,0,"R16 2014",56,"AFCON 2019. En 2014 rozó cuartos vs Alemania en ET."],
  [940,"Jordania","JOR","🇯🇴","J","AFC",82,1702,0.95,1.50,23,61,46,4.0,3.9,18,"WWDLW",2,0.01,0,"Debut 2026",40,"Debut absoluto. Final Copa Asia 2023."],
  [941,"Portugal","POR","🇵🇹","K","UEFA",6,2012,1.90,0.80,49,45,64,5.9,3.3,27,"WWWWW",10,0.03,0,"3° 2006",87,"Mayor scorer de mundiales de su conf. Ronaldo +0.4 goles."],
  [942,"Colombia","COL","🇨🇴","K","CONMEBOL",10,1948,1.65,1.10,40,51,60,5.3,3.5,26,"WWWWW",28,0.08,0,"QF 2014",79,"Final Copa América 2024 invictos. 28 sin perder. Mejor momento histórico."],
  [943,"Congo RD","COD","🇨🇩","K","CAF",72,1728,1.10,1.40,28,58,48,4.3,3.8,20,"WWWWW",5,0.01,0,"GS 1974",47,"Regresa al Mundial 52 años después. AFCON finalistas."],
  [944,"Uzbekistán","UZB","🇺🇿","K","AFC",78,1718,1.05,1.45,25,60,47,4.2,3.7,19,"WWWWW",6,0.01,0,"Debut 2026",43,"Debut absoluto. Copa Asia 2023 semifinalistas."],
  [945,"Inglaterra","ENG","🏴󠁧󠁢󠁥󠁮󠁧󠁿","L","UEFA",4,2021,1.92,0.80,51,43,60,6.5,3.3,35,"WWWWW",8,0.06,1,"Campeón 1966",89,"Más córners del torneo (6.5). Set pieces 35% de goles."],
  [946,"Croacia","CRO","🇭🇷","L","UEFA",12,1928,1.55,0.90,47,45,56,5.1,3.4,28,"WDWWW",4,0.02,0,"Final 2018",71,"Especialistas penaltis: 65%. Compactos."],
  [947,"Ghana","GHA","🇬🇭","L","CAF",55,1782,1.25,1.25,33,56,53,4.7,3.7,21,"WWDLW",2,0.02,0,"QF 2010",49,"En 2010 estuvo a penaltis de semifinales vs Uruguay."],
  [948,"Panamá","PAN","🇵🇦","L","CONCACAF",70,1762,1.05,1.40,28,59,48,4.2,3.9,19,"WDLLW",1,0.02,0,"GS 2018",39,"Solo 1 mundial histórico. Físicos pero limitados técnicamente."],
];

const ins = db.prepare(`
  INSERT OR REPLACE INTO teams
    (id,name,short,flag,group_code,conf,fifa_rank,elo,xg_avg,xga_avg,cs_pct,btts_pct,o25_pct,
     corners_avg,cards_avg,sp_pct,form,streak,sede_bonus,wc_titles,wc_best,strength,note)
  VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
`);
const seedTeams = db.transaction(() => { TEAMS.forEach(t => ins.run(...t)); });
seedTeams();
console.log(`✅ ${TEAMS.length} equipos insertados`);

// ─── Calendario Oficial de Partidos ───────────────────────────────
import fs from 'fs';
import path from 'path';

const schedulePath = path.join(process.cwd(), 'data', 'schedule.json');
const schedule = JSON.parse(fs.readFileSync(schedulePath, 'utf8'));

// Creamos un diccionario para buscar IDs de equipos rápidamente
const teamMap = new Map();
for (const t of TEAMS) {
  teamMap.set(t[1], t[0]);
}

// Helper para insertar o recuperar equipos "Placeholder"
let dummyTeamId = 2000;
function getTeamId(name: string, groupCode: string): number {
  if (teamMap.has(name)) return teamMap.get(name);
  // Si no existe, es un placeholder de fase eliminatoria
  const id = dummyTeamId++;
  const ins = db.prepare(`
    INSERT OR IGNORE INTO teams
      (id,name,short,flag,group_code,conf,fifa_rank,elo,xg_avg,xga_avg,cs_pct,btts_pct,o25_pct,
       corners_avg,cards_avg,sp_pct,form,streak,sede_bonus,wc_titles,wc_best,strength,note)
    VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)
  `);
  // Flag gris para placeholders
  ins.run(id, name, "TBD", "❔", groupCode, "TBD", 999, 1500, 1.0, 1.0, 30, 50, 50, 4.0, 3.0, 20, "DDDDD", 0, 0, 0, "—", 50, "Por definir");
  teamMap.set(name, id);
  return id;
}

const insF = db.prepare(`
  INSERT OR IGNORE INTO fixtures (id,home_id,away_id,group_code,phase,match_date,venue,city,status)
  VALUES (?,?,?,?,?,?,?,?,?)
`);

const seedFix = db.transaction(() => {
  // Limpiar datos anteriores (respetando Foreign Keys)
  db.prepare("DELETE FROM tg_log").run();
  db.prepare("DELETE FROM match_stats").run();
  db.prepare("DELETE FROM predictions").run();
  db.prepare("DELETE FROM fixtures").run();
  db.prepare("DELETE FROM tournament_sims").run();
  
  let fid = 1;
  for (const match of schedule) {
    const hId = getTeamId(match.home, match.groupCode === "—" ? null : match.groupCode);
    const aId = getTeamId(match.away, match.groupCode === "—" ? null : match.groupCode);
    
    // El venue del JSON trae estadio. No tenemos ciudad definida fácil, dejamos city=""
    insF.run(fid++, hId, aId, match.groupCode, match.phase, match.match_date, match.venue, "", "NS");
  }
});
seedFix();

const cnt = (db.prepare("SELECT COUNT(*) AS n FROM fixtures").get() as { n: number }).n;
console.log(`✅ ${cnt} partidos oficiales generados desde schedule.json`);
console.log("\n🎉 Seed completado. Próximo paso:\n   npx tsx scripts/cron.ts");
