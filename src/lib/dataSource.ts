import "server-only";

import {
  ApiFootballError,
  fetchFixture,
  fetchFixtureEvents,
  fetchFixtureLineups,
  fetchWorldCupFixtures,
} from "@/lib/apiFootball/client";
import { isApiConfigured } from "@/lib/apiFootball/env";
import {
  mapApiEventsToMatchEvents,
  mapFixtureToMatch,
} from "@/lib/apiFootball/mapEvents";
import type { Match, MatchEvent } from "@/lib/types";
import {
  StatsBombError,
  fetchMatch,
  fetchMatchEvents,
  fetchMatchLineups,
  fetchWorldCupMatches,
} from "@/lib/statsbomb/client";
import { mapSbEventsToMatchEvents } from "@/lib/statsbomb/mapEvents";
import { mapSbMatchToMatch } from "@/lib/statsbomb/mapMatch";

export type DataSource = "statsbomb" | "api-football";

export function getDataSource(): DataSource {
  const raw = process.env.MATCHAT_DATA_SOURCE?.toLowerCase();
  if (raw === "api-football") return "api-football";
  return "statsbomb";
}

export function isDataSourceReady(): boolean {
  if (getDataSource() === "statsbomb") return true;
  return isApiConfigured();
}

export async function loadWorldCupFixtures(): Promise<Match[]> {
  if (getDataSource() === "api-football") {
    const fixtures = await fetchWorldCupFixtures();
    return fixtures.map(mapFixtureToMatch);
  }

  const matches = await fetchWorldCupMatches();
  return matches.map(mapSbMatchToMatch);
}

export async function loadMatch(matchId: string): Promise<Match | null> {
  if (getDataSource() === "api-football") {
    const fixture = await fetchFixture(matchId);
    return fixture ? mapFixtureToMatch(fixture) : null;
  }

  const match = await fetchMatch(matchId);
  return match ? mapSbMatchToMatch(match) : null;
}

export async function loadMatchEvents(matchId: string): Promise<MatchEvent[]> {
  if (getDataSource() === "api-football") {
    const [fixture, apiEvents, lineups] = await Promise.all([
      fetchFixture(matchId),
      fetchFixtureEvents(matchId),
      fetchFixtureLineups(matchId),
    ]);
    if (!fixture) {
      throw new DataSourceError("Fixture not found", 404);
    }
    return mapApiEventsToMatchEvents(matchId, apiEvents, fixture, lineups);
  }

  const [match, events, lineups] = await Promise.all([
    fetchMatch(matchId),
    fetchMatchEvents(matchId),
    fetchMatchLineups(matchId),
  ]);

  if (!match) {
    throw new DataSourceError("Match not found", 404);
  }

  return mapSbEventsToMatchEvents(matchId, match, events, lineups);
}

export class DataSourceError extends Error {
  constructor(
    message: string,
    public status = 502
  ) {
    super(message);
    this.name = "DataSourceError";
  }
}

export function normalizeDataError(err: unknown): { message: string; status: number } {
  if (err instanceof DataSourceError) {
    return { message: err.message, status: err.status };
  }
  if (err instanceof ApiFootballError) {
    return { message: err.message, status: 502 };
  }
  if (err instanceof StatsBombError) {
    return { message: err.message, status: 502 };
  }
  return { message: "Request failed", status: 502 };
}
