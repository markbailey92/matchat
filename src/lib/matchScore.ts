import type { MatchEvent } from "./types";
import { isEventUnlocked } from "./eventUnlock";
import type { MatchPeriod, PeriodBoundaries } from "./matchPeriod";

export function computeScoreAtTime(
  events: MatchEvent[],
  syncBroadcastMs: number,
  syncedPeriod?: MatchPeriod,
  bounds?: PeriodBoundaries | null
): { home: number; away: number } {
  let home = 0;
  let away = 0;

  for (const event of events) {
    if (event.type !== "goal") continue;
    if (
      bounds &&
      !isEventUnlocked(event, syncBroadcastMs, syncedPeriod, bounds)
    ) {
      continue;
    }
    if (!bounds && (event.broadcastTimeMs ?? event.matchTimeMs) > syncBroadcastMs) {
      continue;
    }
    if (event.team === "home") home += 1;
    else if (event.team === "away") away += 1;
  }

  return { home, away };
}
