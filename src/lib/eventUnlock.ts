import type { MatchEvent } from "./types";
import type { MatchPeriod, PeriodBoundaries } from "./matchPeriod";

function syncPeriodNumber(period: MatchPeriod | undefined): number {
  switch (period) {
    case "2h":
      return 2;
    case "et1":
      return 3;
    case "et2":
      return 4;
    case "pens":
      return 5;
    case "ht":
    case "1h":
    default:
      return 1;
  }
}

/** Whether an event should be visible at the user's synced broadcast clock. */
export function isEventUnlocked(
  event: MatchEvent,
  syncBroadcastMs: number,
  syncedPeriod: MatchPeriod | undefined,
  bounds: PeriodBoundaries | null
): boolean {
  if (event.prematch) return true;

  const eventPeriod = event.statsbombPeriod ?? 1;
  const eventBroadcast = event.broadcastTimeMs ?? event.matchTimeMs;
  const syncPeriod = syncPeriodNumber(syncedPeriod);

  if (syncedPeriod === "ht" && bounds) {
    return eventPeriod <= 1 && event.matchTimeMs <= bounds.halftimeMs;
  }

  if (syncedPeriod === "pens" && bounds) {
    return event.matchTimeMs <= bounds.extraTimeEndMs;
  }

  if (
    syncedPeriod === "2h" &&
    bounds &&
    syncBroadcastMs >= bounds.regulationEndMs - 500 &&
    syncBroadcastMs <= bounds.regulationEndMs + 500
  ) {
    return eventPeriod <= 2 && event.matchTimeMs <= bounds.regulationEndMs;
  }

  if (
    syncedPeriod === "et1" &&
    bounds &&
    syncBroadcastMs >= bounds.et2StartMs - 16 * 60_000 &&
    syncBroadcastMs <= bounds.et2StartMs - 14 * 60_000
  ) {
    const etHalftimeMs = bounds.et2StartMs - 15 * 60_000;
    return eventPeriod <= 3 && event.matchTimeMs <= etHalftimeMs;
  }

  if (eventPeriod < syncPeriod) return true;
  if (eventPeriod > syncPeriod) return false;

  return eventBroadcast <= syncBroadcastMs;
}

export function filterUnlockedEvents(
  events: MatchEvent[],
  syncBroadcastMs: number,
  syncedPeriod: MatchPeriod | undefined,
  bounds: PeriodBoundaries | null
): MatchEvent[] {
  return events.filter((e) =>
    isEventUnlocked(e, syncBroadcastMs, syncedPeriod, bounds)
  );
}
