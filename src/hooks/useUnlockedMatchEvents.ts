import { useEffect, useMemo, useRef, useState } from "react";
import type { MatchEvent } from "@/lib/types";
import { filterUnlockedEvents } from "@/lib/eventUnlock";
import {
  extractPeriodBoundaries,
  type MatchPeriod,
} from "@/lib/matchPeriod";

interface UseUnlockedMatchEventsOptions {
  matchId: string;
  matchTimeMs: number | null;
  syncedPeriod?: MatchPeriod;
  isSynced: boolean;
  pollIntervalMs?: number;
}

export function useUnlockedMatchEvents({
  matchId,
  matchTimeMs,
  syncedPeriod,
  isSynced,
  pollIntervalMs,
}: UseUnlockedMatchEventsOptions) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const prevUnlockedRef = useRef<Set<string>>(new Set());
  const hasSeededUnlockRef = useRef(false);

  useEffect(() => {
    hasSeededUnlockRef.current = false;
    prevUnlockedRef.current = new Set();
  }, [matchId]);

  useEffect(() => {
    let cancelled = false;

    const load = () => {
      fetch(`/api/matches/${matchId}/events`)
        .then(async (r) => {
          const data = await r.json();
          if (!r.ok) throw new Error(data.message ?? data.error ?? "Failed to load events");
          if (!cancelled) {
            setEvents(Array.isArray(data) ? data : []);
            setError(null);
            setLoading(false);
          }
        })
        .catch((err: Error) => {
          if (!cancelled) {
            setError(err.message);
            setLoading(false);
          }
        });
    };

    load();
    if (!pollIntervalMs) return () => { cancelled = true; };

    const id = setInterval(load, pollIntervalMs);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, [matchId, pollIntervalMs]);

  const bounds = useMemo(
    () => (events.length > 0 ? extractPeriodBoundaries(events) : null),
    [events]
  );

  const compareMs = useMemo(() => {
    if (!isSynced || matchTimeMs === null) return null;
    return matchTimeMs;
  }, [isSynced, matchTimeMs]);

  const visibleEvents = useMemo(() => {
    if (compareMs === null) return [];
    return filterUnlockedEvents(events, compareMs, syncedPeriod, bounds).sort(
      (a, b) => b.matchTimeMs - a.matchTimeMs
    );
  }, [events, compareMs, syncedPeriod, bounds]);

  const unlockedIds = useMemo(
    () => new Set(visibleEvents.map((e) => e.id)),
    [visibleEvents]
  );

  const justUnlockedIds = useMemo(() => {
    const next = new Set<string>();

    if (!hasSeededUnlockRef.current) {
      if (loading || compareMs === null) return next;
      hasSeededUnlockRef.current = true;
      prevUnlockedRef.current = new Set(unlockedIds);
      return next;
    }

    for (const id of unlockedIds) {
      if (!prevUnlockedRef.current.has(id)) next.add(id);
    }
    prevUnlockedRef.current = new Set(unlockedIds);
    return next;
  }, [unlockedIds, loading, compareMs]);

  const newestJustUnlockedId = useMemo(() => {
    if (justUnlockedIds.size === 0) return null;
    for (const event of visibleEvents) {
      if (justUnlockedIds.has(event.id)) return event.id;
    }
    return null;
  }, [justUnlockedIds, visibleEvents]);

  return {
    events,
    visibleEvents,
    loading,
    error,
    newestJustUnlockedId,
  };
}
