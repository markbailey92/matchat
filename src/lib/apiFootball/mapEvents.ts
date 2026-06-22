import type { EventType, Match, MatchEvent } from "@/lib/types";
import {
  applySecondOffsets,
  assignWallTimes,
  matchMinuteToMs,
} from "@/lib/eventTime";
import type { ApiFixtureItem, ApiLineup, ApiMatchEvent } from "./types";
import { mapPrematchEvents } from "./mapPrematch";

export function mapFixtureToMatch(item: ApiFixtureItem): Match {
  return {
    id: String(item.fixture.id),
    homeTeam: item.teams.home.name,
    awayTeam: item.teams.away.name,
    homeScore: item.goals.home ?? 0,
    awayScore: item.goals.away ?? 0,
    competition: `FIFA World Cup ${item.league.season}`,
    round: item.league.round,
    kickoff: item.fixture.date,
    status: item.fixture.status.short,
    venue: item.fixture.venue?.name,
    homeLogo: item.teams.home.logo,
    awayLogo: item.teams.away.logo,
  };
}

function mapEventType(type: string, detail: string): EventType {
  if (type === "Goal") return "goal";
  if (type === "Card") {
    if (detail.includes("Red")) return "red_card";
    return "yellow_card";
  }
  if (type === "subst") return "substitution";
  if (type === "Var") return "commentary";
  return "commentary";
}

function formatEventTitle(
  type: EventType,
  detail: string,
  player: string | null,
  teamName: string
): string {
  switch (type) {
    case "goal":
      return player ? `GOAL — ${player}` : `GOAL — ${teamName}`;
    case "yellow_card":
      return player ? `Yellow card — ${player}` : `Yellow card — ${teamName}`;
    case "red_card":
      return player ? `Red card — ${player}` : `Red card — ${teamName}`;
    case "substitution":
      return player ? `Substitution — ${player}` : `Substitution — ${teamName}`;
    default:
      return detail || type;
  }
}

function formatEventDescription(
  event: ApiMatchEvent,
  homeTeam: string,
  awayTeam: string
): string | undefined {
  const parts: string[] = [];
  if (event.detail && event.type !== "Goal") parts.push(event.detail);
  if (event.assist?.name) parts.push(`Assist: ${event.assist.name}`);
  if (event.comments) parts.push(event.comments);
  if (event.type === "Goal" && event.detail) parts.push(event.detail);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function mapApiEventsToMatchEvents(
  fixtureId: string,
  events: ApiMatchEvent[],
  fixture: ApiFixtureItem,
  lineups: ApiLineup[] = []
): MatchEvent[] {
  const prematch = mapPrematchEvents(fixtureId, fixture, lineups);
  const homeId = fixture.teams.home.id;
  const homeTeam = fixture.teams.home.name;
  const awayTeam = fixture.teams.away.name;

  const mapped: MatchEvent[] = events.map((event, index) => {
    const type = mapEventType(event.type, event.detail);
    const team =
      event.team.id === homeId ? "home" : event.team.id ? "away" : undefined;
    const elapsed = event.time.elapsed ?? 0;
    const extra = event.time.extra ?? 0;

    return {
      id: `api-${fixtureId}-${index}`,
      matchId: fixtureId,
      type,
      matchTimeMs: matchMinuteToMs(elapsed, extra, 0),
      title: formatEventTitle(type, event.detail, event.player?.name ?? null, event.team.name),
      description: formatEventDescription(event, homeTeam, awayTeam),
      team,
      player: event.player?.name ?? undefined,
    };
  });

  applySecondOffsets(mapped, events, fixtureId);

  mapped.unshift({
    id: `api-${fixtureId}-kickoff`,
    matchId: fixtureId,
    type: "kickoff",
    matchTimeMs: 0,
    title: "Kick off",
    description: `${homeTeam} vs ${awayTeam}`,
    wallTime: fixture.fixture.date,
  });

  const status = fixture.fixture.status.short;
  if (["HT", "2H", "ET", "BT", "P", "FT", "AET", "PEN"].includes(status)) {
    mapped.push({
      id: `api-${fixtureId}-halftime`,
      matchId: fixtureId,
      type: "halftime",
      matchTimeMs: matchMinuteToMs(45, 0, 0),
      title: "Half time",
      description:
        fixture.score.halftime.home !== null
          ? `${homeTeam} ${fixture.score.halftime.home}–${fixture.score.halftime.away} ${awayTeam}`
          : undefined,
    });
  }

  if (["FT", "AET", "PEN"].includes(status)) {
    mapped.push({
      id: `api-${fixtureId}-fulltime`,
      matchId: fixtureId,
      type: "fulltime",
      matchTimeMs: matchMinuteToMs(90, 0, 0),
      title: "Full time",
      description: `Final score: ${homeTeam} ${fixture.goals.home ?? 0}–${fixture.goals.away ?? 0} ${awayTeam}`,
    });
  }

  const timeline = [...prematch, ...mapped].sort((a, b) => a.matchTimeMs - b.matchTimeMs);
  assignWallTimes(timeline, fixture);
  return timeline;
}
