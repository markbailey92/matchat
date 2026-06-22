import type { MatchEvent } from "./types";

export type MatchPeriod = "1h" | "ht" | "2h" | "et1" | "et2" | "pens";

export interface PeriodBoundaries {
  halftimeMs: number;
  secondHalfStartMs: number;
  regulationEndMs: number;
  et1StartMs: number;
  et2StartMs: number;
  extraTimeEndMs: number;
}

const MS_PER_MIN = 60_000;

/** Broadcast match-clock starts for each period (what the TV shows). */
const BROADCAST_2H_START_MS = 45 * MS_PER_MIN;
const BROADCAST_ET1_START_MS = 90 * MS_PER_MIN;
const BROADCAST_ET2_START_MS = 105 * MS_PER_MIN;

export const PERIOD_LABELS: Record<MatchPeriod, string> = {
  "1h": "1st half",
  ht: "Half time",
  "2h": "2nd half",
  et1: "Extra time (1st half)",
  et2: "Extra time (2nd half)",
  pens: "Penalties",
};

export const PAUSED_PERIODS = new Set<MatchPeriod>(["ht", "pens"]);

const DEFAULT_BOUNDARIES: PeriodBoundaries = {
  halftimeMs: 45 * MS_PER_MIN,
  secondHalfStartMs: 45 * MS_PER_MIN,
  regulationEndMs: 90 * MS_PER_MIN,
  et1StartMs: 90 * MS_PER_MIN,
  et2StartMs: 105 * MS_PER_MIN,
  extraTimeEndMs: 120 * MS_PER_MIN,
};

/** Derive period markers from match events (StatsBomb halftime varies by match). */
export function extractPeriodBoundaries(events: MatchEvent[]): PeriodBoundaries {
  const halftime = events.find((e) => e.type === "halftime");
  const regulationEnd = events.find(
    (e) => e.type === "fulltime" && e.title === "Full time"
  );
  const extraTimeEnd = events.find(
    (e) => e.type === "fulltime" && e.title === "End of extra time"
  );

  return {
    halftimeMs: halftime?.matchTimeMs ?? DEFAULT_BOUNDARIES.halftimeMs,
    secondHalfStartMs: halftime?.matchTimeMs ?? DEFAULT_BOUNDARIES.secondHalfStartMs,
    regulationEndMs: regulationEnd?.matchTimeMs ?? DEFAULT_BOUNDARIES.regulationEndMs,
    et1StartMs: regulationEnd?.matchTimeMs ?? DEFAULT_BOUNDARIES.et1StartMs,
    et2StartMs: extraTimeEnd?.matchTimeMs
      ? extraTimeEnd.matchTimeMs - 15 * MS_PER_MIN
      : DEFAULT_BOUNDARIES.et2StartMs,
    extraTimeEndMs: extraTimeEnd?.matchTimeMs ?? DEFAULT_BOUNDARIES.extraTimeEndMs,
  };
}

function timeToMs(minutes: number, seconds: number): number {
  return (minutes * 60 + seconds) * 1000;
}

/**
 * Convert period + on-screen time to match clock ms (broadcast M:SS).
 * The period selector disambiguates when the clock repeats (e.g. 45:00 in 1H vs 2H).
 * Accepts broadcast time (45:40 in 2H) or period-local time (0:40 → 45:40 in 2H).
 */
export function periodTimeToMatchMs(
  period: MatchPeriod,
  minutes: number,
  seconds: number,
  bounds: PeriodBoundaries
): number {
  const enteredMs = timeToMs(minutes, seconds);

  switch (period) {
    case "1h":
      return enteredMs;

    case "ht":
      return bounds.halftimeMs;

    case "2h":
      if (enteredMs >= BROADCAST_2H_START_MS) return enteredMs;
      return BROADCAST_2H_START_MS + enteredMs;

    case "et1":
      if (enteredMs >= BROADCAST_ET1_START_MS) return enteredMs;
      return BROADCAST_ET1_START_MS + enteredMs;

    case "et2":
      if (enteredMs >= BROADCAST_ET2_START_MS) return enteredMs;
      return BROADCAST_ET2_START_MS + enteredMs;

    case "pens":
      return bounds.extraTimeEndMs;

    default:
      return enteredMs;
  }
}

export function inferPeriod(
  matchTimeMs: number,
  bounds: PeriodBoundaries
): MatchPeriod {
  if (matchTimeMs >= bounds.extraTimeEndMs) return "pens";
  if (matchTimeMs >= BROADCAST_ET2_START_MS) return "et2";
  if (matchTimeMs >= BROADCAST_ET1_START_MS) return "et1";
  if (matchTimeMs >= BROADCAST_2H_START_MS) {
    // 45:00–52:34 can be 1H stoppage or 2H; chronological halftime splits it.
    if (matchTimeMs <= bounds.halftimeMs) return "1h";
    return "2h";
  }
  return "1h";
}
