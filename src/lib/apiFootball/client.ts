import "server-only";

import {
  API_FOOTBALL_BASE,
  WORLD_CUP_LEAGUE_ID,
} from "./constants";
import { getWorldCupSeason } from "./env";
import type {
  ApiFixtureItem,
  ApiFootballResponse,
  ApiLineup,
  ApiMatchEvent,
} from "./types";

export class ApiFootballError extends Error {
  constructor(
    message: string,
    public status?: number
  ) {
    super(message);
    this.name = "ApiFootballError";
  }
}

function getApiKey(): string {
  const key = process.env.API_FOOTBALL_KEY;
  if (!key) {
    throw new ApiFootballError(
      "API_FOOTBALL_KEY is not set. Add your key from https://www.api-football.com to .env.local"
    );
  }
  return key;
}

async function apiFetch<T>(path: string, params: Record<string, string> = {}): Promise<T> {
  const url = new URL(path, API_FOOTBALL_BASE);
  for (const [key, value] of Object.entries(params)) {
    if (value) url.searchParams.set(key, value);
  }

  const res = await fetch(url.toString(), {
    headers: { "x-apisports-key": getApiKey() },
    next: { revalidate: 30 },
  });

  if (!res.ok) {
    throw new ApiFootballError(`API-Football request failed: ${res.statusText}`, res.status);
  }

  const data = (await res.json()) as ApiFootballResponse<T>;

  if (data.errors && Object.keys(data.errors).length > 0) {
    const message =
      typeof data.errors === "object" && !Array.isArray(data.errors)
        ? Object.values(data.errors).join(", ")
        : String(data.errors);
    throw new ApiFootballError(message || "API-Football returned errors");
  }

  return data.response;
}

export async function fetchWorldCupFixtures(): Promise<ApiFixtureItem[]> {
  const fixtures = await apiFetch<ApiFixtureItem[]>("/fixtures", {
    league: String(WORLD_CUP_LEAGUE_ID),
    season: String(getWorldCupSeason()),
    timezone: "UTC",
  });

  return fixtures.sort(
    (a, b) => new Date(a.fixture.date).getTime() - new Date(b.fixture.date).getTime()
  );
}

export async function fetchFixture(fixtureId: string): Promise<ApiFixtureItem | null> {
  const fixtures = await apiFetch<ApiFixtureItem[]>("/fixtures", {
    id: fixtureId,
  });
  return fixtures[0] ?? null;
}

export async function fetchFixtureEvents(fixtureId: string): Promise<ApiMatchEvent[]> {
  return apiFetch<ApiMatchEvent[]>("/fixtures/events", {
    fixture: fixtureId,
  });
}

export async function fetchFixtureLineups(fixtureId: string): Promise<ApiLineup[]> {
  try {
    return await apiFetch<ApiLineup[]>("/fixtures/lineups", {
      fixture: fixtureId,
    });
  } catch {
    return [];
  }
}
