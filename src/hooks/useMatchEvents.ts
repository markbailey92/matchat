import { useEffect, useState } from "react";
import type { MatchEvent } from "@/lib/types";

export function useMatchEvents(matchId: string) {
  const [events, setEvents] = useState<MatchEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

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

    return () => {
      cancelled = true;
    };
  }, [matchId]);

  return { events, loading, error };
}
