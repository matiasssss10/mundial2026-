// lib/data/api.ts
import axios from "axios";
import axiosRetry from "axios-retry";
import { getDb } from "../db/index";

const client = axios.create({
  baseURL: "https://api-football-v1.p.rapidapi.com/v3",
  headers: {
    "X-RapidAPI-Key":  process.env.RAPIDAPI_KEY ?? "",
    "X-RapidAPI-Host": process.env.RAPIDAPI_HOST ?? "api-football-v1.p.rapidapi.com",
  },
  timeout: 12_000,
});

axiosRetry(client, {
  retries: 3,
  retryDelay: axiosRetry.exponentialDelay,
  retryCondition: e =>
    axiosRetry.isNetworkOrIdempotentRequestError(e) || e.response?.status === 429,
});

const memCache = new Map<string, { data: unknown; ts: number }>();
const TTL = 20 * 60 * 1000; // 20 min

async function get<T>(ep: string, params: Record<string, unknown> = {}): Promise<T> {
  const key = ep + JSON.stringify(params);
  const c = memCache.get(key);
  if (c && Date.now() - c.ts < TTL) return c.data as T;

  const res = await client.get<{ response: T }>(ep, { params });
  memCache.set(key, { data: res.data.response, ts: Date.now() });

  try {
    getDb().prepare("INSERT INTO ingest_log (source,endpoint,status,records) VALUES (?,?,?,?)")
      .run("api-football", ep, "ok", Array.isArray(res.data.response) ? (res.data.response as unknown[]).length : 1);
  } catch { /* non-fatal */ }

  return res.data.response;
}

export const WC = { league: 1, season: 2026 };

export async function getFixtures()          { return get("/fixtures", { league: WC.league, season: WC.season }); }
export async function getToday()             { return get("/fixtures", { league: WC.league, season: WC.season, date: new Date().toISOString().split("T")[0] }); }
export async function getFinished()          { return get("/fixtures", { league: WC.league, season: WC.season, status: "FT" }); }
export async function getMatchStats(id: number)  { return get("/fixtures/statistics", { fixture: id }); }
export async function getMatchEvents(id: number) { return get("/fixtures/events",     { fixture: id }); }
export async function getPlayers(id: number)     { return get("/fixtures/players",    { fixture: id }); }

export function statVal(stats: Array<{ type: string; value: string | number | null }>, type: string): number {
  const s = stats.find(s => s.type === type);
  if (!s || s.value === null || s.value === "") return 0;
  if (typeof s.value === "string" && s.value.endsWith("%")) return parseFloat(s.value) || 0;
  return parseFloat(String(s.value)) || 0;
}
