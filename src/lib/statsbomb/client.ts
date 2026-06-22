import "server-only";

import {
  STATSBOMB_MATCHES_URL,
  statsbombEventsUrl,
  statsbombLineupsUrl,
} from "./constants";
import type { SbEvent, SbLineupTeam, SbMatch } from "./types";

export class StatsBombError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "StatsBombError";
  }
}

const CACHE = { revalidate: 86_400 } as const;

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { next: CACHE });
  if (!res.ok) {
    throw new StatsBombError(`StatsBomb fetch failed (${res.status}): ${url}`);
  }
  return res.json() as Promise<T>;
}

let matchesCache: SbMatch[] | null = null;

export async function fetchWorldCupMatches(): Promise<SbMatch[]> {
  if (matchesCache) return matchesCache;
  const matches = await fetchJson<SbMatch[]>(STATSBOMB_MATCHES_URL);
  matchesCache = matches;
  return matches;
}

export async function fetchMatch(matchId: string): Promise<SbMatch | null> {
  const id = Number(matchId);
  if (!Number.isFinite(id)) return null;
  const matches = await fetchWorldCupMatches();
  return matches.find((m) => m.match_id === id) ?? null;
}

export async function fetchMatchEvents(matchId: string): Promise<SbEvent[]> {
  try {
    return await fetchJson<SbEvent[]>(statsbombEventsUrl(matchId));
  } catch (err) {
    if (err instanceof StatsBombError && err.message.includes("404")) {
      return [];
    }
    throw err;
  }
}

export async function fetchMatchLineups(matchId: string): Promise<SbLineupTeam[]> {
  try {
    return await fetchJson<SbLineupTeam[]>(statsbombLineupsUrl(matchId));
  } catch (err) {
    if (err instanceof StatsBombError && err.message.includes("404")) {
      return [];
    }
    throw err;
  }
}
