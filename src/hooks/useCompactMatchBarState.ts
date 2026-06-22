"use client";

import { useMemo } from "react";
import { useMatchEvents } from "@/hooks/useMatchEvents";
import { computeScoreAtTime } from "@/lib/matchScore";
import { computeHalftimeScore } from "@/lib/matchSummary";
import {
  extractPeriodBoundaries,
  type MatchPeriod,
} from "@/lib/matchPeriod";

export function useCompactMatchBarState(
  matchId: string,
  isSynced: boolean,
  matchTimeMs: number | null,
  syncedPeriod?: MatchPeriod
) {
  const { events } = useMatchEvents(matchId);

  const bounds = useMemo(
    () => (events.length > 0 ? extractPeriodBoundaries(events) : null),
    [events]
  );

  const syncMs = isSynced && matchTimeMs !== null ? matchTimeMs : null;

  const score = useMemo(() => {
    if (syncMs === null || !bounds) return null;
    return computeScoreAtTime(events, syncMs, syncedPeriod, bounds);
  }, [events, syncMs, syncedPeriod, bounds]);

  const fulltime = events.find((e) => e.type === "fulltime");
  const halftime = events.find((e) => e.type === "halftime");

  const pastFulltime =
    syncMs !== null &&
    fulltime != null &&
    syncMs >= (fulltime.broadcastTimeMs ?? fulltime.matchTimeMs);

  const pastHalftime =
    syncMs !== null &&
    halftime != null &&
    syncMs >= (halftime.broadcastTimeMs ?? halftime.matchTimeMs);

  const htScore = useMemo(() => computeHalftimeScore(events), [events]);

  return {
    bounds,
    score,
    htScore,
    pastFulltime,
    pastHalftime,
  };
}
