import { createClient, Client } from "@libsql/client";
import path from "path";
import fs from "fs";

const dbUrl = process.env.TURSO_DATABASE_URL || `file:${path.join(process.cwd(), "data", "mundial2026.db")}`;
const authToken = process.env.TURSO_AUTH_TOKEN || "";

let _db: Client | null = null;

export async function getDb(): Promise<Client> {
  if (_db) return _db;
  
  if (dbUrl.startsWith("file:")) {
    const dir = path.dirname(dbUrl.replace("file:", ""));
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  }

  _db = createClient({
    url: dbUrl,
    authToken: authToken,
  });

  await migrate(_db);
  return _db;
}

async function migrate(db: Client) {
  const statements = [
    `CREATE TABLE IF NOT EXISTS teams (
      id            INTEGER PRIMARY KEY,
      name          TEXT NOT NULL,
      short         TEXT,
      flag          TEXT,
      group_code    TEXT,
      conf          TEXT,
      fifa_rank     INTEGER,
      elo           INTEGER DEFAULT 1700,
      xg_avg        REAL DEFAULT 1.20,
      xga_avg       REAL DEFAULT 1.20,
      cs_pct        REAL DEFAULT 35,
      btts_pct      REAL DEFAULT 50,
      o25_pct       REAL DEFAULT 52,
      corners_avg   REAL DEFAULT 5.0,
      cards_avg     REAL DEFAULT 3.5,
      sp_pct        REAL DEFAULT 25,
      form          TEXT DEFAULT 'DDDDD',
      streak        INTEGER DEFAULT 0,
      sede_bonus    REAL DEFAULT 0.02,
      wc_titles     INTEGER DEFAULT 0,
      wc_best       TEXT DEFAULT '—',
      strength      INTEGER DEFAULT 50,
      note          TEXT DEFAULT '',
      updated_at    TEXT DEFAULT (datetime('now'))
    );`,
    `CREATE TABLE IF NOT EXISTS fixtures (
      id           INTEGER PRIMARY KEY,
      home_id      INTEGER REFERENCES teams(id),
      away_id      INTEGER REFERENCES teams(id),
      group_code   TEXT,
      phase        TEXT DEFAULT 'groups',
      match_date   TEXT,
      venue        TEXT,
      city         TEXT,
      status       TEXT DEFAULT 'NS',
      score_home   INTEGER,
      score_away   INTEGER,
      api_updated  TEXT
    );`,
    `CREATE TABLE IF NOT EXISTS predictions (
      id                INTEGER PRIMARY KEY AUTOINCREMENT,
      fixture_id        INTEGER UNIQUE REFERENCES fixtures(id),
      generated_at      TEXT DEFAULT (datetime('now')),
      model_version     TEXT DEFAULT '2.0',
      xg_home           REAL,
      xg_away           REAL,
      prob_home         REAL,
      prob_draw         REAL,
      prob_away         REAL,
      confidence        REAL DEFAULT 0.6,
      prob_o25          REAL,
      prob_btts_yes     REAL
    );`,
    `CREATE TABLE IF NOT EXISTS tournament_sims (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      generated_at TEXT DEFAULT (datetime('now')),
      sims         INTEGER DEFAULT 10000,
      data         TEXT
    );`
  ];
  
  for (const s of statements) {
    await db.execute(s);
  }
}
