import { formatBroadcastMatchTime } from "@/lib/matchClock";
import type { MatchEvent } from "./types";

export interface ScorerEntry {
  player: string;
  minute: string;
}

/** Football minute label from event clock (e.g. 22' or 45+7'). */
export function formatGoalMinute(
  event: Pick<MatchEvent, "broadcastTimeMs" | "matchTimeMs" | "statsbombPeriod">
): string {
  const ms = event.broadcastTimeMs ?? event.matchTimeMs;
  const label = formatBroadcastMatchTime(ms, event.statsbombPeriod);
  const withoutSeconds = label.replace(/:\d{2}$/, "");
  return `${withoutSeconds}'`;
}

export function extractScorers(
  events: MatchEvent[],
  maxTimeMs: number | null
): { home: ScorerEntry[]; away: ScorerEntry[] } {
  const home: ScorerEntry[] = [];
  const away: ScorerEntry[] = [];

  const sorted = [...events]
    .filter((e) => e.type === "goal")
    .filter((e) => maxTimeMs === null || e.matchTimeMs <= maxTimeMs)
    .sort((a, b) => a.matchTimeMs - b.matchTimeMs);

  for (const event of sorted) {
    if (!event.player || !event.team) continue;
    const entry: ScorerEntry = {
      player: event.player,
      minute: formatGoalMinute(event),
    };
    if (event.team === "home") home.push(entry);
    else away.push(entry);
  }

  return { home, away };
}

export function extractAssists(
  events: MatchEvent[],
  maxTimeMs: number | null
): { home: ScorerEntry[]; away: ScorerEntry[] } {
  const home: ScorerEntry[] = [];
  const away: ScorerEntry[] = [];

  const sorted = [...events]
    .filter((e) => e.type === "goal" && e.assistPlayer)
    .filter((e) => maxTimeMs === null || e.matchTimeMs <= maxTimeMs)
    .sort((a, b) => a.matchTimeMs - b.matchTimeMs);

  for (const event of sorted) {
    if (!event.assistPlayer || !event.team) continue;
    const entry: ScorerEntry = {
      player: event.assistPlayer,
      minute: formatGoalMinute(event),
    };
    if (event.team === "home") home.push(entry);
    else away.push(entry);
  }

  return { home, away };
}

export function computeHalftimeScore(
  events: MatchEvent[]
): { home: number; away: number } | null {
  const halftime = events.find((e) => e.type === "halftime");
  if (!halftime) return null;

  let home = 0;
  let away = 0;
  for (const event of events) {
    if (event.type !== "goal") continue;
    if (event.matchTimeMs > halftime.matchTimeMs) continue;
    if (event.team === "home") home += 1;
    else if (event.team === "away") away += 1;
  }
  return { home, away };
}

export function formatScorerLine(entries: ScorerEntry[]): string {
  return entries.map((e) => `${e.player} (${e.minute})`).join(", ");
}
