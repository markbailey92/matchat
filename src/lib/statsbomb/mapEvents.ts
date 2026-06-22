import { layoutLineup } from "@/lib/formationLayout";
import type { LineupPlayer, MatchEvent } from "@/lib/types";
import {
  buildStatsbombHalfEndMap,
  statsbombEventToMatchMs,
  statsbombTimeToMs,
} from "@/lib/eventTime";
import { buildKickoffIso } from "./mapMatch";
import type { SbEvent, SbLineupTeam, SbMatch } from "./types";

const PREMATCH_REFEREE_MS = -3 * 60_000;
const PREMATCH_HOME_LINEUP_MS = -2 * 60_000;
const PREMATCH_AWAY_LINEUP_MS = -1 * 60_000;

function isHomeTeam(match: SbMatch, teamId?: number): boolean {
  return teamId === match.home_team.home_team_id;
}

function isPenaltyShootoutGoal(event: SbEvent): boolean {
  return event.period >= 5 && event.minute >= 120;
}

function isPenaltyShootoutShot(event: SbEvent): boolean {
  return event.period >= 5 && event.minute >= 120;
}

function formatShotDescription(event: SbEvent): string | undefined {
  const parts: string[] = [];
  const shotType = event.shot?.type?.name;
  if (shotType === "Penalty") parts.push("Penalty");
  if (shotType === "Free Kick") parts.push("Free kick");
  if (event.shot?.statsbomb_xg != null) {
    parts.push(`xG ${event.shot.statsbomb_xg.toFixed(2)}`);
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function formatShotOutcomeLabel(outcome?: string): string {
  switch (outcome) {
    case "Saved":
      return "Saved";
    case "Blocked":
      return "Blocked";
    case "Off T":
    case "Wayward":
      return "Off target";
    case "Post":
      return "Post";
    default:
      return outcome ?? "Shot";
  }
}

function mapPrematchEvents(
  matchId: string,
  match: SbMatch,
  lineups: SbLineupTeam[]
): MatchEvent[] {
  const events: MatchEvent[] = [];

  if (match.referee?.name) {
    const country = match.referee.country?.name;
    events.push({
      id: `sb-${matchId}-officials`,
      matchId,
      type: "officials",
      matchTimeMs: PREMATCH_REFEREE_MS,
      prematch: true,
      title: "Match officials",
      description: country
        ? `Referee: ${match.referee.name} (${country})`
        : `Referee: ${match.referee.name}`,
    });
  }

  if (match.stadium?.name) {
    const country = match.stadium.country?.name;
    events.push({
      id: `sb-${matchId}-venue`,
      matchId,
      type: "commentary",
      matchTimeMs: PREMATCH_REFEREE_MS - 1,
      prematch: true,
      title: "Venue",
      description: country ? `${match.stadium.name}, ${country}` : match.stadium.name,
    });
  }

  for (const lineup of lineups) {
    const isHome = lineup.team_id === match.home_team.home_team_id;
    const starters = lineup.lineup.filter((p) =>
      p.positions.some((pos) => pos.start_reason === "Starting XI")
    );

    if (starters.length === 0) continue;

    const lineupPlayers: LineupPlayer[] = starters.map((p) => ({
      jerseyNumber: p.jersey_number,
      name: p.player_nickname ?? p.player_name,
      position:
        p.positions.find((pos) => pos.start_reason === "Starting XI")
          ?.position ?? "Unknown",
    }));

    const { formation } = layoutLineup(lineupPlayers);

    const description = starters
      .sort((a, b) => a.jersey_number - b.jersey_number)
      .map((p) => `${p.jersey_number}. ${p.player_nickname ?? p.player_name}`)
      .join("\n");

    events.push({
      id: `sb-${matchId}-lineup-${isHome ? "home" : "away"}`,
      matchId,
      type: "lineup",
      matchTimeMs: isHome ? PREMATCH_HOME_LINEUP_MS : PREMATCH_AWAY_LINEUP_MS,
      prematch: true,
      team: isHome ? "home" : "away",
      title: `Lineup — ${lineup.team_name}`,
      description,
      lineupPlayers,
      formation,
    });
  }

  return events;
}

function formatGoalDescription(event: SbEvent): string | undefined {
  const parts: string[] = [];
  const shotType = event.shot?.type?.name;
  if (shotType === "Penalty") parts.push("Penalty");
  if (shotType === "Free Kick") parts.push("Free kick");
  const technique = event.shot?.technique?.name;
  if (technique && technique !== "Normal") parts.push(technique);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

function resolvePlayerDisplayName(
  lineups: SbLineupTeam[],
  playerId?: number,
  fallback?: string
): string | undefined {
  if (playerId) {
    for (const team of lineups) {
      for (const p of team.lineup) {
        if (p.player_id === playerId) {
          return p.player_nickname ?? p.player_name;
        }
      }
    }
  }
  if (fallback) {
    for (const team of lineups) {
      for (const p of team.lineup) {
        if (p.player_name === fallback) {
          return p.player_nickname ?? p.player_name;
        }
      }
    }
    return fallback;
  }
  return undefined;
}

const CORNER_AWARD_TRIGGERS = new Set([
  "Block",
  "Clearance",
  "Goal Keeper",
  "Shot",
  "Pass",
]);

function formatCornerAwardReason(typeName: string, event: SbEvent): string {
  switch (typeName) {
    case "Goal Keeper":
      return "After save";
    case "Block":
      return "Deflection";
    case "Clearance":
      return "After clearance";
    case "Shot": {
      const outcome = event.shot?.outcome?.name;
      if (outcome === "Blocked") return "Blocked shot";
      if (outcome === "Saved") return "After save";
      return "Shot deflected out";
    }
    case "Pass": {
      const outcome = event.pass?.outcome?.name;
      if (outcome === "Out") return "Ball out";
      return "Ball out of play";
    }
    default:
      return "Ball out of play";
  }
}

function findCornerAwardTrigger(
  cornerEvent: SbEvent,
  events: SbEvent[]
): SbEvent | undefined {
  const possession = cornerEvent.possession;
  if (possession == null) return undefined;

  const prevPossessionEvents = events.filter((e) => e.possession === possession - 1);
  for (let i = prevPossessionEvents.length - 1; i >= 0; i--) {
    const candidate = prevPossessionEvents[i];
    const typeName = candidate.type.name;
    if (!CORNER_AWARD_TRIGGERS.has(typeName)) continue;

    if (typeName === "Pass") {
      const outcome = candidate.pass?.outcome?.name;
      if (outcome !== "Incomplete" && outcome !== "Out") continue;
    }

    if (typeName === "Shot") {
      const outcome = candidate.shot?.outcome?.name;
      if (
        outcome !== "Blocked" &&
        outcome !== "Saved" &&
        outcome !== "Off T" &&
        outcome !== "Wayward"
      ) {
        continue;
      }
    }

    return candidate;
  }

  return undefined;
}

function mapCornerAwardReason(
  matchId: string,
  cornerEvent: SbEvent,
  events: SbEvent[],
  halfEndMsByPeriod: Map<number, number>,
  teamSide: "home" | "away" | undefined
): MatchEvent | null {
  const trigger = findCornerAwardTrigger(cornerEvent, events);
  if (!trigger) return null;

  const matchTimeMs = statsbombEventToMatchMs(trigger, halfEndMsByPeriod);
  const reason = formatCornerAwardReason(trigger.type.name, trigger);

  return {
    id: `sb-${matchId}-corner-awarded-${cornerEvent.id}`,
    matchId,
    type: "corner_awarded",
    matchTimeMs,
    broadcastTimeMs: statsbombTimeToMs(trigger.minute, trigger.second),
    statsbombPeriod: trigger.period,
    title: "Corner awarded",
    description: reason,
    team: teamSide,
  };
}

function resolveGoalAssist(
  goalEvent: SbEvent,
  events: SbEvent[]
): { id: number; name: string } | undefined {
  const keyPassId = goalEvent.shot?.key_pass_id;
  if (keyPassId) {
    const pass = events.find((e) => e.id === keyPassId);
    if (pass?.player) return pass.player;
  }

  const possession = goalEvent.possession;
  if (possession == null) return undefined;

  for (const event of events) {
    if (event.possession !== possession) continue;
    if (event.type.name !== "Pass") continue;
    if (!event.pass?.goal_assist) continue;
    if (event.player) return event.player;
  }

  return undefined;
}

export function mapSbEventsToMatchEvents(
  matchId: string,
  match: SbMatch,
  events: SbEvent[],
  lineups: SbLineupTeam[] = []
): MatchEvent[] {
  const prematch = mapPrematchEvents(matchId, match, lineups);
  const kickoffIso = buildKickoffIso(match);
  const homeName = match.home_team.home_team_name;
  const awayName = match.away_team.away_team_name;
  const timeline: MatchEvent[] = [...prematch];

  const seenHalfStarts = new Set<number>();
  const seenHalfEnds = new Set<number>();
  const seenFreeKickPossessions = new Set<number>();
  const seenCornerPossessions = new Set<number>();
  const halfEndMsByPeriod = buildStatsbombHalfEndMap(events);

  for (const event of events) {
    const typeName = event.type.name;
    const matchTimeMs = statsbombEventToMatchMs(event, halfEndMsByPeriod);
    const broadcastTimeMs = statsbombTimeToMs(event.minute, event.second);
    const statsbombPeriod = event.period;
    const teamSide = event.team
      ? isHomeTeam(match, event.team.id)
        ? "home"
        : "away"
      : undefined;
    const playerName = resolvePlayerDisplayName(
      lineups,
      event.player?.id,
      event.player?.name
    );

    if (typeName === "Half Start") {
      if (seenHalfStarts.has(event.period)) continue;
      seenHalfStarts.add(event.period);

      if (event.period === 1 && event.minute === 0) {
        timeline.push({
          id: `sb-${matchId}-kickoff`,
          matchId,
          type: "kickoff",
          matchTimeMs: 0,
          broadcastTimeMs: 0,
          statsbombPeriod: 1,
          title: "Kick off",
          description: `${homeName} vs ${awayName}`,
          wallTime: kickoffIso,
        });
      } else if (event.period === 2 && event.minute === 45) {
        timeline.push({
          id: `sb-${matchId}-second-half`,
          matchId,
          type: "commentary",
          matchTimeMs,
          broadcastTimeMs,
          statsbombPeriod,
          title: "Second half",
          description: "Play resumes",
        });
      }
      continue;
    }

    if (typeName === "Half End") {
      if (seenHalfEnds.has(event.period)) continue;
      seenHalfEnds.add(event.period);

      if (event.period === 1) {
        timeline.push({
          id: `sb-${matchId}-halftime`,
          matchId,
          type: "halftime",
          matchTimeMs,
          broadcastTimeMs,
          statsbombPeriod,
          title: "Half time",
        });
      } else if (event.period === 2) {
        timeline.push({
          id: `sb-${matchId}-fulltime`,
          matchId,
          type: "fulltime",
          matchTimeMs,
          broadcastTimeMs,
          statsbombPeriod,
          title: "Full time",
          description: "End of regulation",
        });
      } else if (event.period === 4) {
        timeline.push({
          id: `sb-${matchId}-et-end`,
          matchId,
          type: "fulltime",
          matchTimeMs,
          broadcastTimeMs,
          statsbombPeriod,
          title: "End of extra time",
          description: `Score: ${homeName} ${match.home_score}–${match.away_score} ${awayName}`,
        });
      }
      continue;
    }

    if (typeName === "Shot" && event.shot?.outcome?.name === "Goal") {
      if (isPenaltyShootoutGoal(event)) continue;

      const assistRaw = resolveGoalAssist(event, events);
      const assistPlayer = assistRaw
        ? resolvePlayerDisplayName(lineups, assistRaw.id, assistRaw.name)
        : undefined;

      timeline.push({
        id: `sb-${matchId}-goal-${event.id}`,
        matchId,
        type: "goal",
        matchTimeMs,
        broadcastTimeMs,
        statsbombPeriod,
        title: playerName ? `GOAL — ${playerName}` : "GOAL",
        description: formatGoalDescription(event),
        team: teamSide,
        player: playerName,
        assistPlayer,
      });
      continue;
    }

    if (typeName === "Shot") {
      if (isPenaltyShootoutShot(event)) continue;

      const shotType = event.shot?.type?.name;
      const outcome = event.shot?.outcome?.name;

      if (outcome === "Goal") continue;
      if (shotType === "Free Kick") continue;

      const isOnTarget = outcome === "Saved";
      const outcomeLabel = formatShotOutcomeLabel(outcome);

      timeline.push({
        id: `sb-${matchId}-shot-${event.id}`,
        matchId,
        type: isOnTarget ? "shot_on_target" : "shot",
        matchTimeMs,
        broadcastTimeMs,
        statsbombPeriod,
        title: playerName
          ? `${isOnTarget ? "Shot on target" : "Shot"} — ${playerName} (${outcomeLabel})`
          : `${isOnTarget ? "Shot on target" : "Shot"} (${outcomeLabel})`,
        description: formatShotDescription(event),
        team: teamSide,
        player: playerName,
      });
      continue;
    }

    if (typeName === "Foul Committed" || typeName === "Bad Behaviour") {
      const card =
        event.foul_committed?.card?.name ?? event.bad_behaviour?.card?.name;

      if (card) {
        const isRed = card.includes("Red");
        timeline.push({
          id: `sb-${matchId}-card-${event.id}`,
          matchId,
          type: isRed ? "red_card" : "yellow_card",
          matchTimeMs,
          broadcastTimeMs,
          statsbombPeriod,
          title: playerName
            ? `${isRed ? "Red" : "Yellow"} card — ${playerName}`
            : `${isRed ? "Red" : "Yellow"} card`,
          team: teamSide,
          player: playerName,
        });
        continue;
      }

      if (typeName === "Foul Committed") {
        timeline.push({
          id: `sb-${matchId}-foul-${event.id}`,
          matchId,
          type: "foul",
          matchTimeMs,
          broadcastTimeMs,
          statsbombPeriod,
          title: playerName ? `Foul — ${playerName}` : "Foul",
          team: teamSide,
          player: playerName,
        });
      }
      continue;
    }

    if (typeName === "Pass" && event.pass?.type?.name === "Corner") {
      const possession = event.possession;
      if (possession !== undefined && seenCornerPossessions.has(possession)) {
        continue;
      }
      if (possession !== undefined) seenCornerPossessions.add(possession);

      const awarded = mapCornerAwardReason(
        matchId,
        event,
        events,
        halfEndMsByPeriod,
        teamSide
      );
      if (awarded) timeline.push(awarded);

      const technique = event.pass?.technique?.name;
      timeline.push({
        id: `sb-${matchId}-corner-taken-${event.id}`,
        matchId,
        type: "corner_taken",
        matchTimeMs,
        broadcastTimeMs,
        statsbombPeriod,
        title: playerName ? `Corner — ${playerName}` : "Corner taken",
        description: technique && technique !== "None" ? technique : undefined,
        team: teamSide,
        player: playerName,
      });
      continue;
    }

    if (typeName === "Pass" && event.pass?.type?.name === "Free Kick") {
      const possession = event.possession;
      if (possession !== undefined && seenFreeKickPossessions.has(possession)) {
        continue;
      }
      if (possession !== undefined) seenFreeKickPossessions.add(possession);

      timeline.push({
        id: `sb-${matchId}-fk-${event.id}`,
        matchId,
        type: "free_kick",
        matchTimeMs,
        broadcastTimeMs,
        statsbombPeriod,
        title: playerName ? `Free kick — ${playerName}` : "Free kick",
        team: teamSide,
        player: playerName,
      });
      continue;
    }

    if (typeName === "Shot" && event.shot?.type?.name === "Free Kick") {
      if (event.shot?.outcome?.name === "Goal" && !isPenaltyShootoutGoal(event)) {
        continue;
      }

      const outcome = event.shot?.outcome?.name;
      const outcomeLabel =
        outcome === "Goal"
          ? "Goal"
          : outcome === "Saved"
            ? "Saved"
            : outcome === "Blocked"
              ? "Blocked"
              : "Off target";

      timeline.push({
        id: `sb-${matchId}-fk-shot-${event.id}`,
        matchId,
        type: "free_kick",
        matchTimeMs,
        broadcastTimeMs,
        statsbombPeriod,
        title: playerName
          ? `Free kick — ${playerName} (${outcomeLabel})`
          : `Free kick (${outcomeLabel})`,
        description:
          event.shot?.statsbomb_xg != null
            ? `xG ${event.shot.statsbomb_xg.toFixed(2)}`
            : undefined,
        team: teamSide,
        player: playerName,
      });
      continue;
    }

    if (typeName === "Substitution") {
      const replacement = resolvePlayerDisplayName(
        lineups,
        event.substitution?.replacement?.id,
        event.substitution?.replacement?.name
      );
      timeline.push({
        id: `sb-${matchId}-sub-${event.id}`,
        matchId,
        type: "substitution",
        matchTimeMs,
        broadcastTimeMs,
        statsbombPeriod,
        title: playerName ? `Substitution — ${playerName}` : "Substitution",
        description: replacement ? `On: ${replacement}` : undefined,
        team: teamSide,
        player: playerName,
      });
    }
  }

  timeline.sort((a, b) => a.matchTimeMs - b.matchTimeMs);
  assignWallTimesFromKickoff(timeline, kickoffIso);
  return timeline;
}

function assignWallTimesFromKickoff(events: MatchEvent[], kickoffIso: string): void {
  const kickoffMs = Date.parse(kickoffIso);
  if (!Number.isFinite(kickoffMs)) return;

  for (const event of events) {
    if (event.wallTime) continue;
    if (event.prematch) continue;
    if (event.matchTimeMs < 0) continue;
    event.wallTime = new Date(kickoffMs + event.matchTimeMs).toISOString();
  }
}
