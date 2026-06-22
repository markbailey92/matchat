import type { MatchEvent } from "./types";
import type { ClockSync } from "./types";
import { getCurrentMatchTimeMs } from "./matchClock";
import {
  extractPeriodBoundaries,
  inferPeriod,
  type MatchPeriod,
  type PeriodBoundaries,
} from "./matchPeriod";

export const LIVE_PLAYBACK_RATE = 1;

export const REPLAY_PLAYBACK_RATES = [1, 2, 4, 8] as const;

export type ReplayPlaybackRate = (typeof REPLAY_PLAYBACK_RATES)[number];

export type BreakKind = "ht" | "pre-et" | "et-ht";

export interface BreakEventSnapshot {
  secondHalf: boolean;
  et1: boolean;
  et2: boolean;
}

export interface PeriodSchedule {
  bounds: PeriodBoundaries;
  secondHalfStartMs: number;
  hasSecondHalfEvent: boolean;
  hasEt1Started: boolean;
  hasEt2Started: boolean;
  hasET: boolean;
  hasPens: boolean;
  etHalftimeMs: number | null;
}

interface TargetSyncState {
  matchTimeAtSyncMs: number;
  paused: boolean;
  period: MatchPeriod;
  pausedAtWallMs?: number;
}

export interface ResolveAutomatedSyncOptions {
  isLiveMatch?: boolean;
}

export function createBreakSnapshot(schedule: PeriodSchedule): BreakEventSnapshot {
  return {
    secondHalf: schedule.hasSecondHalfEvent,
    et1: schedule.hasEt1Started,
    et2: schedule.hasEt2Started,
  };
}

export function extractPeriodSchedule(events: MatchEvent[]): PeriodSchedule {
  const bounds = extractPeriodBoundaries(events);
  const secondHalf = events.find((e) => e.title === "Second half");
  const hasET =
    events.some((e) => (e.statsbombPeriod ?? 0) >= 3) ||
    events.some((e) => e.title === "End of extra time");
  const hasPens = events.some((e) => (e.statsbombPeriod ?? 0) >= 5);

  return {
    bounds,
    secondHalfStartMs: secondHalf?.matchTimeMs ?? bounds.halftimeMs + 1000,
    hasSecondHalfEvent: !!secondHalf,
    hasEt1Started: events.some((e) => (e.statsbombPeriod ?? 0) >= 3),
    hasEt2Started: events.some((e) => (e.statsbombPeriod ?? 0) >= 4),
    hasET,
    hasPens,
    etHalftimeMs: hasET ? bounds.et2StartMs - 15 * 60_000 : null,
  };
}

function buildSync(
  state: TargetSyncState,
  now: number,
  source: ClockSync,
  schedule?: PeriodSchedule
): ClockSync {
  const breakSnapshot =
    state.paused && schedule
      ? (source.breakSnapshot ?? createBreakSnapshot(schedule))
      : undefined;

  return {
    syncedAt: now,
    matchTimeAtSyncMs: state.matchTimeAtSyncMs,
    paused: state.paused,
    period: state.period,
    autoPeriod: source.autoPeriod !== false,
    pausedAtWallMs: state.paused ? state.pausedAtWallMs ?? now : undefined,
    playbackRate: source.playbackRate ?? LIVE_PLAYBACK_RATE,
    breakSnapshot,
  };
}

function computeTargetState(
  matchMs: number,
  schedule: PeriodSchedule
): TargetSyncState {
  const { bounds, secondHalfStartMs, hasET, hasPens, etHalftimeMs } = schedule;

  if (hasPens && matchMs >= bounds.extraTimeEndMs) {
    return {
      matchTimeAtSyncMs: bounds.extraTimeEndMs,
      paused: true,
      period: "pens",
    };
  }

  if (hasET && etHalftimeMs != null && matchMs >= bounds.et2StartMs) {
    return {
      matchTimeAtSyncMs: matchMs,
      paused: false,
      period: "et2",
    };
  }

  if (hasET && etHalftimeMs != null && matchMs >= etHalftimeMs) {
    return {
      matchTimeAtSyncMs: etHalftimeMs,
      paused: true,
      period: "et1",
    };
  }

  if (hasET && matchMs >= bounds.et1StartMs) {
    return {
      matchTimeAtSyncMs: matchMs,
      paused: false,
      period: "et1",
    };
  }

  if (hasET && matchMs >= bounds.regulationEndMs) {
    return {
      matchTimeAtSyncMs: bounds.regulationEndMs,
      paused: true,
      period: "2h",
    };
  }

  if (!hasET && matchMs >= bounds.regulationEndMs) {
    return {
      matchTimeAtSyncMs: bounds.regulationEndMs,
      paused: true,
      period: "2h",
    };
  }

  if (matchMs >= secondHalfStartMs) {
    return {
      matchTimeAtSyncMs: matchMs,
      paused: false,
      period: "2h",
    };
  }

  if (matchMs >= bounds.halftimeMs) {
    return {
      matchTimeAtSyncMs: bounds.halftimeMs,
      paused: true,
      period: "ht",
    };
  }

  return {
    matchTimeAtSyncMs: matchMs,
    paused: false,
    period: "1h",
  };
}

function pauseKind(
  sync: ClockSync,
  schedule: PeriodSchedule
): BreakKind | "pens" | "ft" | null {
  if (!sync.paused) return null;

  const { bounds } = schedule;
  const ms = sync.matchTimeAtSyncMs;
  const period = sync.period;

  if (period === "ht" || ms <= bounds.halftimeMs) return "ht";
  if (period === "pens" || ms >= bounds.extraTimeEndMs) return "pens";
  if (
    schedule.hasET &&
    schedule.etHalftimeMs != null &&
    ms >= schedule.etHalftimeMs - 1000 &&
    ms <= schedule.etHalftimeMs + 1000
  ) {
    return "et-ht";
  }
  if (schedule.hasET && ms >= bounds.regulationEndMs - 1000 && period === "2h") {
    return "pre-et";
  }
  if (!schedule.hasET && ms >= bounds.regulationEndMs - 1000) return "ft";
  return null;
}

function breakEventArrived(
  kind: BreakKind,
  schedule: PeriodSchedule,
  snapshot: BreakEventSnapshot
): boolean {
  switch (kind) {
    case "ht":
      return schedule.hasSecondHalfEvent && !snapshot.secondHalf;
    case "pre-et":
      return schedule.hasEt1Started && !snapshot.et1;
    case "et-ht":
      return schedule.hasEt2Started && !snapshot.et2;
  }
}

function resumeTargetForBreak(
  kind: BreakKind,
  schedule: PeriodSchedule
): TargetSyncState {
  switch (kind) {
    case "ht":
      return {
        matchTimeAtSyncMs: schedule.secondHalfStartMs,
        paused: false,
        period: "2h",
      };
    case "pre-et":
      return {
        matchTimeAtSyncMs: schedule.bounds.et1StartMs,
        paused: false,
        period: "et1",
      };
    case "et-ht":
      return {
        matchTimeAtSyncMs: schedule.bounds.et2StartMs,
        paused: false,
        period: "et2",
      };
  }
}

function tryResumePausedSync(
  sync: ClockSync,
  schedule: PeriodSchedule,
  now: number,
  isLiveMatch: boolean
): ClockSync | null {
  if (!sync.paused) return null;

  const pausedAt = sync.pausedAtWallMs ?? sync.syncedAt;
  const kind = pauseKind(sync, schedule);
  const snapshot = sync.breakSnapshot ?? createBreakSnapshot(schedule);

  if (
    kind === "ht" ||
    kind === "pre-et" ||
    kind === "et-ht"
  ) {
    if (isLiveMatch && breakEventArrived(kind, schedule, snapshot)) {
      return buildSync(resumeTargetForBreak(kind, schedule), now, sync);
    }

    // After a page refresh we may have lost the break snapshot but kick-off is already in the feed.
    if (isLiveMatch && !sync.breakSnapshot) {
      if (kind === "ht" && schedule.hasSecondHalfEvent) {
        return buildSync(resumeTargetForBreak("ht", schedule), now, sync);
      }
      if (kind === "pre-et" && schedule.hasEt1Started) {
        return buildSync(resumeTargetForBreak("pre-et", schedule), now, sync);
      }
      if (kind === "et-ht" && schedule.hasEt2Started) {
        return buildSync(resumeTargetForBreak("et-ht", schedule), now, sync);
      }
    }

    return buildSync(
      {
        matchTimeAtSyncMs: sync.matchTimeAtSyncMs,
        paused: true,
        period: sync.period ?? "ht",
        pausedAtWallMs: pausedAt,
      },
      sync.syncedAt,
      { ...sync, breakSnapshot: snapshot },
      schedule
    );
  }

  switch (kind) {
    case "pens":
    case "ft":
      return buildSync(
        {
          matchTimeAtSyncMs: sync.matchTimeAtSyncMs,
          paused: true,
          period: sync.period ?? (kind === "pens" ? "pens" : "2h"),
          pausedAtWallMs: pausedAt,
        },
        sync.syncedAt,
        sync
      );

    default:
      return null;
  }
}

/** Manually resume from a break (for replaying finished matches). */
export function jumpFromBreak(
  sync: ClockSync,
  schedule: PeriodSchedule,
  kind: BreakKind,
  now = Date.now()
): ClockSync {
  return buildSync(resumeTargetForBreak(kind, schedule), now, sync);
}

function breakSnapshotsEqual(
  a: BreakEventSnapshot | undefined,
  b: BreakEventSnapshot | undefined
): boolean {
  return (
    (a?.secondHalf ?? false) === (b?.secondHalf ?? false) &&
    (a?.et1 ?? false) === (b?.et1 ?? false) &&
    (a?.et2 ?? false) === (b?.et2 ?? false)
  );
}

export function syncStatesEqual(a: ClockSync, b: ClockSync): boolean {
  return (
    a.syncedAt === b.syncedAt &&
    a.matchTimeAtSyncMs === b.matchTimeAtSyncMs &&
    a.paused === b.paused &&
    a.period === b.period &&
    a.pausedAtWallMs === b.pausedAtWallMs &&
    a.autoPeriod === b.autoPeriod &&
    (a.playbackRate ?? LIVE_PLAYBACK_RATE) === (b.playbackRate ?? LIVE_PLAYBACK_RATE) &&
    breakSnapshotsEqual(a.breakSnapshot, b.breakSnapshot)
  );
}

/** Advance sync through HT, 2H, ET, and pens based on match period markers. */
export function resolveAutomatedSync(
  sync: ClockSync,
  schedule: PeriodSchedule,
  now = Date.now(),
  options: ResolveAutomatedSyncOptions = {}
): ClockSync {
  if (sync.autoPeriod === false) return sync;

  const isLiveMatch = options.isLiveMatch ?? false;

  const resumed = tryResumePausedSync(sync, schedule, now, isLiveMatch);
  if (resumed) return resumed;

  if (sync.paused) return sync;

  const matchMs = getCurrentMatchTimeMs(sync, now) ?? sync.matchTimeAtSyncMs;
  const target = computeTargetState(matchMs, schedule);
  const currentPeriod = sync.period ?? inferPeriod(sync.matchTimeAtSyncMs, schedule.bounds);

  if (
    target.paused === sync.paused &&
    target.period === currentPeriod &&
    !target.paused
  ) {
    return sync;
  }

  if (target.paused) {
    return buildSync(
      {
        ...target,
        pausedAtWallMs: now,
      },
      now,
      sync,
      schedule
    );
  }

  return buildSync(target, now, sync);
}
