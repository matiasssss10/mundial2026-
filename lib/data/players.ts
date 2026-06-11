// lib/data/players.ts
// Diccionario de jugadores estrella y alineaciones probables para simulación Mundial 2026

export interface TeamTactics {
  star: string;
  formation: string;
  lineup: string[];
}

const teamsDb: Record<string, TeamTactics> = {
  "Argentina": {
    star: "Lionel Messi",
    formation: "4-3-3",
    lineup: ["E. Martínez", "N. Molina", "C. Romero", "N. Otamendi", "N. Tagliafico", "R. De Paul", "E. Fernández", "A. Mac Allister", "L. Messi", "L. Martínez", "A. Di María"]
  },
  "Brasil": {
    star: "Vinícius Jr.",
    formation: "4-2-3-1",
    lineup: ["Alisson", "Danilo", "Marquinhos", "G. Magalhães", "W. Borges", "Casemiro", "B. Guimarães", "Raphinha", "Neymar Jr", "Vinícius Jr.", "Rodrygo"]
  },
  "Francia": {
    star: "Kylian Mbappé",
    formation: "4-2-3-1",
    lineup: ["M. Maignan", "J. Koundé", "I. Konaté", "W. Saliba", "T. Hernández", "A. Tchouaméni", "E. Camavinga", "O. Dembélé", "A. Griezmann", "K. Mbappé", "O. Giroud"]
  },
  "Inglaterra": {
    star: "Harry Kane",
    formation: "4-2-3-1",
    lineup: ["J. Pickford", "K. Walker", "J. Stones", "H. Maguire", "L. Shaw", "D. Rice", "J. Bellingham", "P. Foden", "B. Saka", "H. Kane", "M. Rashford"]
  },
  "España": {
    star: "Lamine Yamal",
    formation: "4-3-3",
    lineup: ["U. Simón", "D. Carvajal", "R. Le Normand", "A. Laporte", "A. Grimaldo", "Rodri", "Pedri", "F. Ruiz", "L. Yamal", "A. Morata", "N. Williams"]
  },
  "Alemania": {
    star: "Jamal Musiala",
    formation: "4-2-3-1",
    lineup: ["M. Neuer", "J. Kimmich", "A. Rüdiger", "J. Tah", "M. Mittelstädt", "T. Kroos", "R. Andrich", "J. Musiala", "I. Gündoğan", "F. Wirtz", "K. Havertz"]
  },
  "México": {
    star: "Santi Giménez",
    formation: "4-3-3",
    lineup: ["G. Ochoa", "K. Álvarez", "C. Montes", "J. Vásquez", "J. Gallardo", "E. Álvarez", "L. Chávez", "E. Sánchez", "U. Antuna", "S. Giménez", "H. Lozano"]
  },
  "Colombia": {
    star: "Luis Díaz",
    formation: "4-2-3-1",
    lineup: ["C. Vargas", "D. Muñoz", "Y. Mina", "J. Lucumí", "J. Mojica", "J. Lerma", "R. Ríos", "J. Arias", "J. Rodríguez", "L. Díaz", "R. Borré"]
  },
  "Uruguay": {
    star: "Darwin Núñez",
    formation: "4-3-3",
    lineup: ["S. Rochet", "N. Nández", "R. Araújo", "J. Giménez", "M. Viña", "F. Valverde", "M. Ugarte", "N. De la Cruz", "F. Pellistri", "D. Núñez", "M. Araújo"]
  },
  "Estados Unidos": {
    star: "Christian Pulisic",
    formation: "4-3-3",
    lineup: ["M. Turner", "S. Dest", "C. Richards", "T. Ream", "A. Robinson", "T. Adams", "W. McKennie", "G. Reyna", "T. Weah", "F. Balogun", "C. Pulisic"]
  },
  "Portugal": {
    star: "Cristiano Ronaldo",
    formation: "4-3-3",
    lineup: ["D. Costa", "J. Cancelo", "R. Dias", "Pepe", "N. Mendes", "J. Palhinha", "Vitinha", "B. Fernandes", "B. Silva", "C. Ronaldo", "R. Leão"]
  },
  "Países Bajos": {
    star: "Cody Gakpo",
    formation: "3-4-1-2",
    lineup: ["B. Verbruggen", "M. de Ligt", "V. van Dijk", "N. Aké", "D. Dumfries", "J. Schouten", "T. Reijnders", "D. Blind", "X. Simons", "C. Gakpo", "M. Depay"]
  },
  "Italia": {
    star: "Federico Chiesa",
    formation: "3-5-2",
    lineup: ["G. Donnarumma", "M. Darmian", "A. Bastoni", "R. Calafiori", "F. Dimarco", "N. Barella", "Jorginho", "D. Frattesi", "F. Chiesa", "G. Scamacca", "L. Pellegrini"]
  },
  "Bélgica": {
    star: "Kevin De Bruyne",
    formation: "4-2-3-1",
    lineup: ["K. Casteels", "T. Castagne", "W. Faes", "J. Vertonghen", "A. Theate", "A. Onana", "Y. Tielemans", "J. Doku", "K. De Bruyne", "L. Trossard", "R. Lukaku"]
  }
};

export function getStarPlayer(teamName: string): string {
  return teamsDb[teamName]?.star ?? `Delantero Estrella (${teamName})`;
}

export function getLineup(teamName: string): { formation: string, lineup: string[] } {
  if (teamsDb[teamName]) {
    return { formation: teamsDb[teamName].formation, lineup: teamsDb[teamName].lineup };
  }
  // Generic fallback for smaller nations
  return {
    formation: "4-4-2",
    lineup: ["Portero", "Lat. Der.", "Def. Cen.", "Def. Cen.", "Lat. Izq.", "Med. Der.", "Med. Cen.", "Med. Cen.", "Med. Izq.", "Delantero 1", "Delantero 2"]
  };
}
