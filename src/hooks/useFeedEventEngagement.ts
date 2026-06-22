import { useCallback, useEffect, useRef, useState } from "react";
import type { EventEngagementData } from "@/lib/engagement";

const POLL_INTERVAL_MS = 5_000;

const EMPTY_ENGAGEMENT: EventEngagementData = { totals: {}, markers: [] };

export function useFeedEventEngagement(matchId: string, eventIds: string[]) {
  const [engagement, setEngagement] = useState<EventEngagementData>(EMPTY_ENGAGEMENT);
  const idsKey = eventIds.join(",");
  const fetchGenerationRef = useRef(0);

  const load = useCallback(() => {
    if (!idsKey) {
      setEngagement(EMPTY_ENGAGEMENT);
      return;
    }

    const generation = ++fetchGenerationRef.current;

    fetch(
      `/api/matches/${matchId}/engagement?ids=${encodeURIComponent(idsKey)}`
    )
      .then(async (r) => {
        if (!r.ok || generation !== fetchGenerationRef.current) return;
        const data = (await r.json()) as EventEngagementData;
        if (generation !== fetchGenerationRef.current) return;
        if (data?.totals && Array.isArray(data.markers)) {
          setEngagement(data);
        }
      })
      .catch(() => {});
  }, [matchId, idsKey]);

  useEffect(() => {
    load();
    if (!idsKey) return;

    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [load, idsKey]);

  return { ...engagement, refresh: load };
}
