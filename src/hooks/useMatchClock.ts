import { useCallback, useEffect, useRef, useState } from "react";
import {
  cloneSyncAtNow,
  createSync,
  createSyncFromPeriod,
  getCurrentMatchTimeMs,
  loadSync,
  saveSync,
  clearSync,
} from "@/lib/matchClock";
import { isLiveMatch } from "@/lib/matchFormat";
import type { MatchPeriod, PeriodBoundaries } from "@/lib/matchPeriod";
import {
  extractPeriodSchedule,
  jumpFromBreak,
  LIVE_PLAYBACK_RATE,
  resolveAutomatedSync,
  syncStatesEqual,
  type BreakKind,
  type PeriodSchedule,
  type ReplayPlaybackRate,
} from "@/lib/matchPeriodAutomation";
import type { ClockSync, MatchEvent } from "@/lib/types";

const LIVE_EVENT_POLL_MS = 30_000;

function tickIntervalMs(sync: ClockSync | null): number {
  if (!sync || sync.paused) return 1000;
  const rate = sync.playbackRate ?? LIVE_PLAYBACK_RATE;
  return rate > 1 ? Math.max(200, Math.floor(1000 / rate)) : 1000;
}

interface UseMatchClockOptions {
  matchStatus?: string;
  pollIntervalMs?: number;
}

export function useMatchClock(matchId: string, options: UseMatchClockOptions = {}) {
  const live = isLiveMatch(options.matchStatus);
  const eventPollMs = options.pollIntervalMs ?? (live ? LIVE_EVENT_POLL_MS : undefined);

  const [sync, setSync] = useState<ClockSync | null>(null);
  const [matchTimeMs, setMatchTimeMs] = useState<number | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [schedule, setSchedule] = useState<PeriodSchedule | null>(null);
  const syncRef = useRef<ClockSync | null>(null);
  syncRef.current = sync;

  useEffect(() => {
    setSync(loadSync(matchId));
    setLoaded(true);
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch(`/api/matches/${matchId}/events`)
        .then(async (r) => {
          if (!r.ok) return;
          const events = (await r.json()) as MatchEvent[];
          if (!cancelled && Array.isArray(events)) {
            setSchedule(extractPeriodSchedule(events));
          }
        })
        .catch(() => {});
    };

    load();
    if (!eventPollMs) return () => { cancelled = true; };

    const id = setInterval(load, eventPollMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [matchId, eventPollMs]);

  useEffect(() => {
    if (!sync || !schedule) return;

    const applyAutomation = () => {
      const current = syncRef.current;
      if (!current) return;

      const next = resolveAutomatedSync(current, schedule, Date.now(), {
        isLiveMatch: live,
      });
      if (!syncStatesEqual(current, next)) {
        saveSync(matchId, next);
        setSync(next);
      }
    };

    applyAutomation();
    const id = setInterval(applyAutomation, 1000);
    return () => clearInterval(id);
  }, [matchId, sync, schedule, live]);

  useEffect(() => {
    if (!sync) {
      setMatchTimeMs(null);
      return;
    }

    const tick = () => {
      const current = syncRef.current;
      if (!current) return;
      setMatchTimeMs(getCurrentMatchTimeMs(current));
    };

    tick();
    if (sync.paused) return;

    const id = setInterval(tick, tickIntervalMs(sync));
    return () => clearInterval(id);
  }, [sync]);

  const persistSync = useCallback(
    (next: ClockSync) => {
      saveSync(matchId, next);
      setSync(next);
    },
    [matchId]
  );

  const setClock = useCallback(
    (matchTimeMs: number, paused = false, period?: MatchPeriod) => {
      const prev = syncRef.current;
      persistSync(
        createSync(matchTimeMs, paused, period, true, {
          playbackRate: prev?.playbackRate ?? LIVE_PLAYBACK_RATE,
        })
      );
    },
    [persistSync]
  );

  const setClockFromPeriod = useCallback(
    (
      period: MatchPeriod,
      minutes: number,
      seconds: number,
      bounds: PeriodBoundaries
    ) => {
      const prev = syncRef.current;
      const next = createSyncFromPeriod(period, minutes, seconds, bounds);
      persistSync({
        ...next,
        playbackRate: prev?.playbackRate ?? LIVE_PLAYBACK_RATE,
      });
    },
    [persistSync]
  );

  const pauseClock = useCallback(() => {
    const current = syncRef.current;
    if (!current || current.paused) return;
    const anchored = cloneSyncAtNow(current);
    persistSync({
      ...anchored,
      paused: true,
      pausedAtWallMs: Date.now(),
    });
  }, [persistSync]);

  const resumeClock = useCallback(() => {
    const current = syncRef.current;
    if (!current || !current.paused) return;
    persistSync({ ...cloneSyncAtNow(current), paused: false });
  }, [persistSync]);

  const resetClock = useCallback(() => {
    clearSync(matchId);
    setSync(null);
  }, [matchId]);

  const adjustClock = useCallback(
    (deltaMs: number) => {
      const current = syncRef.current;
      if (!current) return;
      const at = getCurrentMatchTimeMs(current) ?? current.matchTimeAtSyncMs;
      const nextMs = Math.max(0, at + deltaMs);
      persistSync({
        ...cloneSyncAtNow(current),
        matchTimeAtSyncMs: nextMs,
        syncedAt: Date.now(),
      });
    },
    [persistSync]
  );

  const setPlaybackRate = useCallback(
    (playbackRate: ReplayPlaybackRate) => {
      const current = syncRef.current;
      if (!current) return;
      persistSync({ ...cloneSyncAtNow(current), playbackRate });
    },
    [persistSync]
  );

  const jumpBreak = useCallback(
    (kind: BreakKind) => {
      const current = syncRef.current;
      if (!current || !schedule) return;
      persistSync(jumpFromBreak(current, schedule, kind));
    },
    [persistSync, schedule]
  );

  const playbackRate = sync?.playbackRate ?? LIVE_PLAYBACK_RATE;
  const isLivePace = playbackRate === LIVE_PLAYBACK_RATE;

  return {
    sync,
    matchTimeMs,
    loaded,
    isSynced: sync !== null,
    isPaused: sync?.paused ?? false,
    playbackRate,
    isLivePace,
    isLiveMatch: live,
    setClock,
    setClockFromPeriod,
    pauseClock,
    resumeClock,
    resetClock,
    adjustClock,
    setPlaybackRate,
    jumpToSecondHalf: () => jumpBreak("ht"),
    jumpToExtraTime: () => jumpBreak("pre-et"),
    jumpToEtSecondHalf: () => jumpBreak("et-ht"),
  };
}
