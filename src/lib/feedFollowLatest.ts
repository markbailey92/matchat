const FEED_FOLLOW_LATEST_KEY = "matchat-feed-follow-latest";

export function loadFeedFollowLatest(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return localStorage.getItem(FEED_FOLLOW_LATEST_KEY) === "1";
  } catch {
    return false;
  }
}

export function saveFeedFollowLatest(enabled: boolean): void {
  localStorage.setItem(FEED_FOLLOW_LATEST_KEY, enabled ? "1" : "0");
}
