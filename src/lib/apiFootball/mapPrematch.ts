import type { MatchEvent } from "@/lib/types";
import type { ApiFixtureItem, ApiLineup } from "./types";

/** Negative offsets sort before kickoff (0:00) but unlock once the clock is synced. */
const PREMATCH_REFEREE_MS = -3 * 60_000;
const PREMATCH_HOME_LINEUP_MS = -2 * 60_000;
const PREMATCH_AWAY_LINEUP_MS = -1 * 60_000;

function formatPlayerLine(entry: ApiLineup["startXI"][number]): string {
  const { name, number, pos } = entry.player;
  const num = number != null ? `${number}. ` : "";
  const position = pos ? ` (${pos})` : "";
  return `${num}${name ?? "Unknown"}${position}`;
}

function formatLineupDescription(lineup: ApiLineup): string {
  const parts: string[] = [];

  if (lineup.formation) parts.push(`Formation: ${lineup.formation}`);
  if (lineup.coach?.name) parts.push(`Coach: ${lineup.coach.name}`);

  if (lineup.startXI.length > 0) {
    parts.push(
      "Starting XI:\n" + lineup.startXI.map(formatPlayerLine).join("\n")
    );
  }

  if (lineup.substitutes.length > 0) {
    parts.push(
      "Substitutes:\n" + lineup.substitutes.map(formatPlayerLine).join("\n")
    );
  }

  return parts.join("\n\n");
}

export function mapPrematchEvents(
  fixtureId: string,
  fixture: ApiFixtureItem,
  lineups: ApiLineup[]
): MatchEvent[] {
  const events: MatchEvent[] = [];
  const homeId = fixture.teams.home.id;

  const referee = fixture.fixture.referee?.trim();
  if (referee) {
    events.push({
      id: `api-${fixtureId}-officials`,
      matchId: fixtureId,
      type: "officials",
      matchTimeMs: PREMATCH_REFEREE_MS,
      prematch: true,
      title: "Match officials",
      description: `Referee: ${referee}`,
    });
  }

  const venue = fixture.fixture.venue;
  if (venue?.name) {
    const venueDesc = venue.city ? `${venue.name}, ${venue.city}` : venue.name;
    events.push({
      id: `api-${fixtureId}-venue`,
      matchId: fixtureId,
      type: "commentary",
      matchTimeMs: PREMATCH_REFEREE_MS - 1,
      prematch: true,
      title: "Venue",
      description: venueDesc,
    });
  }

  for (const lineup of lineups) {
    const isHome = lineup.team.id === homeId;
    const side = isHome ? "home" : "away";

    events.push({
      id: `api-${fixtureId}-lineup-${side}`,
      matchId: fixtureId,
      type: "lineup",
      matchTimeMs: isHome ? PREMATCH_HOME_LINEUP_MS : PREMATCH_AWAY_LINEUP_MS,
      prematch: true,
      team: side,
      title: `Lineup — ${lineup.team.name}`,
      description: formatLineupDescription(lineup),
    });
  }

  return events;
}
