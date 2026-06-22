import type { ApiFixtureItem, ApiMatchEvent } from "./apiFootball/types";
import type { MatchEvent } from "./types";

/** Convert API minute (+ stoppage) and seconds within that minute to linear match clock ms. */
export function matchMinuteToMs(
  elapsed: number,
  extra: number,
  secondsInMinute = 0
): number {
  return ((elapsed + extra) * 60 + secondsInMinute) * 1000;
}

/** StatsBomb uses cumulative match minutes with per-event seconds. */
export function statsbombTimeToMs(minute: number, second: number): number {
  return (minute * 60 + second) * 1000;
}

const PERIOD_CLOCK_FLOOR: Record<number, number> = {
  2: 45,
  3: 90,
  4: 105,
  5: 120,
};

/**
 * StatsBomb resets the TV clock at each period (2H starts at 45:00, ET at 90:00, etc.).
 * Naive minute→ms breaks ordering when stoppage pushes 1H past 45:00 — e.g. "Second half"
 * at 45:00 would appear before 1H events at 46:00–52:34. Anchor sub-threshold events
 * after the previous period's half-time whistle.
 */
export function statsbombEventToMatchMs(
  event: { period: number; minute: number; second: number },
  halfEndMsByPeriod: Map<number, number>
): number {
  const naive = statsbombTimeToMs(event.minute, event.second);
  if (event.period <= 1) return naive;

  const prevHalfEnd = halfEndMsByPeriod.get(event.period - 1);
  if (prevHalfEnd == null) return naive;

  const periodFloor = PERIOD_CLOCK_FLOOR[event.period];
  if (periodFloor == null) return naive;

  if (naive <= prevHalfEnd) {
    return (
      prevHalfEnd +
      (event.minute - periodFloor) * 60_000 +
      event.second * 1000 +
      1000
    );
  }

  return naive;
}

export function buildStatsbombHalfEndMap(
  events: Array<{ period: number; minute: number; second: number; type: { name: string } }>
): Map<number, number> {
  const halfEndMsByPeriod = new Map<number, number>();
  for (const event of events) {
    if (event.type.name !== "Half End") continue;
    if (halfEndMsByPeriod.has(event.period)) continue;
    halfEndMsByPeriod.set(
      event.period,
      statsbombTimeToMs(event.minute, event.second)
    );
  }
  return halfEndMsByPeriod;
}

/** Spread events that share the same API minute across seconds 0–59. */
export function applySecondOffsets(
  events: MatchEvent[],
  apiEvents: ApiMatchEvent[],
  fixtureId: string
): void {
  const groups = new Map<string, number[]>();

  apiEvents.forEach((apiEvent, index) => {
    const elapsed = apiEvent.time.elapsed ?? 0;
    const extra = apiEvent.time.extra ?? 0;
    const key = `${elapsed}:${extra}`;
    const list = groups.get(key) ?? [];
    list.push(index);
    groups.set(key, list);
  });

  for (const indices of groups.values()) {
    const count = indices.length;
    indices.forEach((apiIndex, orderInMinute) => {
      const apiEvent = apiEvents[apiIndex];
      const elapsed = apiEvent.time.elapsed ?? 0;
      const extra = apiEvent.time.extra ?? 0;
      const secondInMinute =
        count === 1 ? 0 : Math.min(59, Math.floor((orderInMinute * 60) / count));

      const event = events.find((e) => e.id === `api-${fixtureId}-${apiIndex}`);
      if (event) {
        event.matchTimeMs = matchMinuteToMs(elapsed, extra, secondInMinute);
      }
    });
  }
}

/** Estimate wall-clock ISO time from kickoff / half-time period timestamps. */
export function computeWallTime(
  fixture: ApiFixtureItem,
  matchTimeMs: number
): string | undefined {
  const kickoffUnix = fixture.fixture.timestamp;
  if (!kickoffUnix) return fixture.fixture.date;

  const matchSeconds = Math.max(0, Math.floor(matchTimeMs / 1000));
  const periods = fixture.fixture.periods;

  if (periods?.first && periods?.second && matchSeconds > 45 * 60) {
    const secondHalfSeconds = matchSeconds - 45 * 60;
    return new Date((periods.second + secondHalfSeconds) * 1000).toISOString();
  }

  if (periods?.first) {
    return new Date((periods.first + matchSeconds) * 1000).toISOString();
  }

  if (matchTimeMs < 0) {
    return new Date((kickoffUnix + Math.floor(matchTimeMs / 1000)) * 1000).toISOString();
  }

  return new Date((kickoffUnix + matchSeconds) * 1000).toISOString();
}

export function assignWallTimes(events: MatchEvent[], fixture: ApiFixtureItem): void {
  for (const event of events) {
    event.wallTime = computeWallTime(fixture, event.matchTimeMs);
  }
}

export function formatWallTime(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
  });
}
