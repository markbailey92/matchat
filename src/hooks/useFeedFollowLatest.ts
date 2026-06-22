"use client";

import { useCallback, useEffect, useState } from "react";
import { loadFeedFollowLatest, saveFeedFollowLatest } from "@/lib/feedFollowLatest";

export function useFeedFollowLatest() {
  const [followLatest, setFollowLatestState] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    setFollowLatestState(loadFeedFollowLatest());
    setLoaded(true);
  }, []);

  const setFollowLatest = useCallback((enabled: boolean) => {
    setFollowLatestState(enabled);
    saveFeedFollowLatest(enabled);
  }, []);

  const toggleFollowLatest = useCallback(() => {
    setFollowLatestState((current) => {
      const next = !current;
      saveFeedFollowLatest(next);
      return next;
    });
  }, []);

  return {
    followLatest,
    loaded,
    setFollowLatest,
    toggleFollowLatest,
  };
}
