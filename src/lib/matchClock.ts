import type { MatchPeriod, PeriodBoundaries } from "./matchPeriod";
import { PAUSED_PERIODS, periodTimeToMatchMs } from "./matchPeriod";
import type { ClockSync } from "./types";

const SYNC_STORAGE_KEY = "matchat-clock-sync";

/** Format match milliseconds as M:SS (seconds always shown). */
export function formatMatchTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

const STATSBOMB_PERIOD_END_MINUTE: Record<number, number> = {
  1: 45,
  2: 90,
  3: 105,
  4: 120,
};

/**
 * TV-style broadcast clock. Stoppage time uses 45+1, 90+2, etc. when the
 * StatsBomb period is known (1 = 1H, 2 = 2H, 3 = ET1, 4 = ET2).
 */
export function formatBroadcastMatchTime(
  ms: number,
  statsbombPeriod?: number
): string {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  const periodEnd =
    statsbombPeriod != null
      ? STATSBOMB_PERIOD_END_MINUTE[statsbombPeriod]
      : undefined;

  if (periodEnd != null && minutes > periodEnd) {
    return `${periodEnd}+${minutes - periodEnd}`;
  }

  return formatMatchTime(ms);
}

/** Parse clock input: "45:40", "45", or compact "4540" (MMSS) into milliseconds. */
export function parseMatchTimeInput(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (trimmed.includes(":")) {
    const parts = trimmed.split(":");
    if (parts.length !== 2) return null;

    const minutes = parseInt(parts[0], 10);
    const seconds = parseInt(parts[1], 10);
    if (
      isNaN(minutes) ||
      isNaN(seconds) ||
      minutes < 0 ||
      seconds < 0 ||
      seconds >= 60
    ) {
      return null;
    }
    return (minutes * 60 + seconds) * 1000;
  }

  if (!/^\d+$/.test(trimmed)) return null;

  let minutes: number;
  let seconds: number;

  if (trimmed.length <= 2) {
    minutes = parseInt(trimmed, 10);
    seconds = 0;
  } else {
    seconds = parseInt(trimmed.slice(-2), 10);
    minutes = parseInt(trimmed.slice(0, -2), 10);
  }

  if (isNaN(minutes) || isNaN(seconds) || minutes < 0 || seconds >= 60) {
    return null;
  }

  return (minutes * 60 + seconds) * 1000;
}

export function getCurrentMatchTimeMs(sync: ClockSync | null, now = Date.now()): number | null {
  if (!sync) return null;
  if (sync.paused) return sync.matchTimeAtSyncMs;
  const rate = sync.playbackRate ?? 1;
  return sync.matchTimeAtSyncMs + (now - sync.syncedAt) * rate;
}

/** Re-anchor sync at the current computed match time (preserves playback settings). */
export function cloneSyncAtNow(sync: ClockSync, now = Date.now()): ClockSync {
  const matchTimeMs = getCurrentMatchTimeMs(sync, now) ?? sync.matchTimeAtSyncMs;
  return {
    syncedAt: now,
    matchTimeAtSyncMs: matchTimeMs,
    paused: sync.paused,
    period: sync.period,
    autoPeriod: sync.autoPeriod !== false,
    pausedAtWallMs: sync.paused ? sync.pausedAtWallMs ?? now : undefined,
    playbackRate: sync.playbackRate ?? 1,
    breakSnapshot: sync.breakSnapshot,
  };
}

export function createSync(
  matchTimeMs: number,
  paused = false,
  period?: MatchPeriod,
  autoPeriod = true,
  playback?: Pick<ClockSync, "playbackRate">
): ClockSync {
  return {
    syncedAt: Date.now(),
    matchTimeAtSyncMs: matchTimeMs,
    paused,
    period,
    autoPeriod,
    pausedAtWallMs: paused ? Date.now() : undefined,
    playbackRate: playback?.playbackRate ?? 1,
  };
}

export function createSyncFromPeriod(
  period: MatchPeriod,
  minutes: number,
  seconds: number,
  bounds: PeriodBoundaries
): ClockSync {
  const matchTimeMs = periodTimeToMatchMs(period, minutes, seconds, bounds);
  const paused = PAUSED_PERIODS.has(period);
  return createSync(matchTimeMs, paused, period, true);
}

export function loadSync(matchId: string): ClockSync | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(`${SYNC_STORAGE_KEY}:${matchId}`);
    if (!raw) return null;
    return JSON.parse(raw) as ClockSync;
  } catch {
    return null;
  }
}

export function saveSync(matchId: string, sync: ClockSync): void {
  localStorage.setItem(`${SYNC_STORAGE_KEY}:${matchId}`, JSON.stringify(sync));
}

export function clearSync(matchId: string): void {
  localStorage.removeItem(`${SYNC_STORAGE_KEY}:${matchId}`);
}
