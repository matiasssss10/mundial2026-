import fs from 'fs';

const text = fs.readFileSync('data/schedule.txt', 'utf8');
const lines = text.split('\n');

const fixtures = [];
let currentDateStr = '';
const months = { "junio": "06", "julio": "07" };

const nameMap = {
  "República de Corea": "Corea del Sur",
  "República Checa": "Chequia",
  "Catar": "Qatar",
  "RI de Irán": "Irán",
  "Irán": "Irán",
  "Arabia Saudí": "Arabia Saudita",
  "Arabia Saudita": "Arabia Saudita",
  "Bosnia y Herzegovina": "Bosnia-Herz.",
  "RD Congo": "Congo RD",
};

for (const line of lines) {
  const t = line.trim();
  if (!t) continue;

  const dateMatch = t.match(/^[A-Za-zÁ-Úá-ú]+, (\d+) de ([a-z]+) (\d+)$/i);
  if (dateMatch) {
    let day = dateMatch[1];
    if (day.length === 1) day = "0" + day;
    const month = months[dateMatch[2].toLowerCase()];
    const year = dateMatch[3];
    currentDateStr = `${year}-${month}-${day}`;
    continue;
  }

  // 15:00 - México v Sudáfrica – Grupo A - Estadio Ciudad de México
  // 15:00 - Partido 74 – 1º Grupo E v 3º Grupo A/B/C/D/F - Estadio Boston
  let timeStr = "00:00";
  let matchText = t;
  const timeMatch = t.match(/^(\d{2}:\d{2}) - (.*)$/);
  if (timeMatch) {
    timeStr = timeMatch[1];
    matchText = timeMatch[2];
  }

  // ISO date
  let iso = `${currentDateStr}T${timeStr}:00-05:00`;
  if (timeStr === "00:00") {
    // 00:00 actually means next day midnight UTC, so keep it as is, or adjust day
  }

  let phase = "groups";
  let groupCode = "—";
  let home = "";
  let away = "";
  let venue = "Desconocido";

  // Check if knockout
  if (matchText.startsWith("Partido ")) {
    phase = "knockout";
    const koMatch = matchText.match(/^Partido (\d+) [–-] (.+?) v (.+?) - Estadio (.*)$/);
    if (koMatch) {
      home = koMatch[2].trim();
      away = koMatch[3].trim();
      venue = koMatch[4].trim();
    } else {
      continue;
    }
  } else {
    // Group stage
    // México v Sudáfrica – Grupo A - Estadio Ciudad de México
    // split by " v "
    const vSplit = matchText.split(" v ");
    if (vSplit.length !== 2) continue;
    home = vSplit[0].trim();
    
    // Sudáfrica – Grupo A - Estadio Ciudad de México
    const right = vSplit[1];
    const groupMatch = right.match(/(.*) [–-] Grupo ([A-L]) [–-] Estadio (.*)/);
    if (groupMatch) {
      away = groupMatch[1].trim();
      groupCode = groupMatch[2].trim();
      venue = groupMatch[3].trim();
    } else {
      continue;
    }
  }

  home = nameMap[home] || home;
  away = nameMap[away] || away;

  fixtures.push({
    match_date: iso,
    home,
    away,
    groupCode,
    phase,
    venue
  });
}

fs.writeFileSync('data/schedule.json', JSON.stringify(fixtures, null, 2));
console.log(`Parsed ${fixtures.length} fixtures!`);
