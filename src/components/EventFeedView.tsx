"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { useSearchParams } from "next/navigation";
import type { Match } from "@/lib/types";
import {
  getEventFeedGradientFromTopColor,
  getEventFeedTopColor,
  lerpHexColor,
} from "@/lib/eventStyles";
import { useDisplayName } from "@/hooks/useDisplayName";
import { useFeedFollowLatest } from "@/hooks/useFeedFollowLatest";
import { useFeedEventEngagement } from "@/hooks/useFeedEventEngagement";
import { useCompactMatchBarState } from "@/hooks/useCompactMatchBarState";
import { useMatchClock } from "@/hooks/useMatchClock";
import { useUnlockedMatchEvents } from "@/hooks/useUnlockedMatchEvents";
import { fullScreenSafeClass, safeAreaBottomClass, safeAreaInsetXClass, safeAreaTopClass, touchButtonClass } from "@/lib/layout";
import { animateScrollLeft, timelineJumpDurationMs, type ScrollAnimationHandle } from "@/lib/motion";
import { FEED_EFFECTS_ROOT_ID } from "@/lib/reactionEffects";
import { CompactMatchBar } from "./CompactMatchBar";
import { EventFeedPanel } from "./EventFeedPanel";
import { EventFeedSlide } from "./EventFeedSlide";
import { FeedReactionTimeline } from "./FeedReactionTimeline";

interface EventFeedViewProps {
  match: Match;
}

export function EventFeedView({ match }: EventFeedViewProps) {
  const clock = useMatchClock(match.id, { matchStatus: match.status });
  const displayName = useDisplayName();
  const { followLatest, loaded: followLatestLoaded, setFollowLatest, toggleFollowLatest } =
    useFeedFollowLatest();
  const searchParams = useSearchParams();
  const startEventId = searchParams.get("event");
  const containerRef = useRef<HTMLDivElement>(null);
  const backgroundRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const hasScrolledToStart = useRef(false);
  const scrollAnimRef = useRef<ScrollAnimationHandle | null>(null);
  const isAnimatingScrollRef = useRef(false);
  const [timelineJumpActive, setTimelineJumpActive] = useState(false);
  const [frozenPanelIndex, setFrozenPanelIndex] = useState<number | null>(null);
  const [panelTransitionActive, setPanelTransitionActive] = useState(false);
  const panelRevealStartedRef = useRef(false);
  const isTimelineScrubbingRef = useRef(false);
  const [timelineScrubbing, setTimelineScrubbing] = useState(false);
  const isUserSwipeRef = useRef(false);

  const pollIntervalMs =
    match.status &&
    ["1H", "HT", "2H", "ET", "P", "LIVE"].includes(match.status)
      ? 30_000
      : undefined;

  const { visibleEvents: unlockedNewestFirst, loading, error } = useUnlockedMatchEvents({
    matchId: match.id,
    matchTimeMs: clock.matchTimeMs,
    syncedPeriod: clock.sync?.period,
    isSynced: clock.isSynced,
    pollIntervalMs,
  });

  const feedEvents = useMemo(
    () => [...unlockedNewestFirst].reverse(),
    [unlockedNewestFirst]
  );

  const updateFeedBackground = useCallback(
    (scrollLeft: number, slideWidth: number) => {
      const layer = backgroundRef.current;
      if (!layer || feedEvents.length === 0 || slideWidth <= 0) return;

      const maxIndex = feedEvents.length - 1;
      const progress = Math.max(0, Math.min(scrollLeft / slideWidth, maxIndex));
      const fromIndex = Math.floor(progress);
      const toIndex = Math.min(fromIndex + 1, maxIndex);
      const fraction = progress - fromIndex;

      const fromEvent = feedEvents[fromIndex];
      const toEvent = feedEvents[toIndex];
      if (!fromEvent || !toEvent) return;

      const topColor = lerpHexColor(
        getEventFeedTopColor(fromEvent.type),
        getEventFeedTopColor(toEvent.type),
        fromIndex === toIndex ? 0 : fraction
      );

      layer.style.background = getEventFeedGradientFromTopColor(topColor);
    },
    [feedEvents]
  );

  const syncFromContainer = useCallback(
    (container: HTMLDivElement) => {
      const slideWidth = container.clientWidth;
      if (slideWidth <= 0) return;

      updateFeedBackground(container.scrollLeft, slideWidth);
      const progress = Math.max(
        0,
        Math.min(container.scrollLeft / slideWidth, feedEvents.length - 1)
      );
      setScrollProgress(progress);
      setActiveIndex(Math.round(progress));
    },
    [feedEvents.length, updateFeedBackground]
  );

  const finishTimelineJump = useCallback(() => {
    isAnimatingScrollRef.current = false;
    scrollAnimRef.current = null;
    setTimelineJumpActive(false);
  }, []);

  const cancelProgrammaticScroll = useCallback(() => {
    scrollAnimRef.current?.cancel();
    scrollAnimRef.current = null;
    isAnimatingScrollRef.current = false;
    finishTimelineJump();
  }, [finishTimelineJump]);

  const beginUserSwipe = useCallback(() => {
    if (isTimelineScrubbingRef.current) return;

    cancelProgrammaticScroll();
    setFrozenPanelIndex(null);
    setPanelTransitionActive(false);
    panelRevealStartedRef.current = false;
    isUserSwipeRef.current = true;
  }, [cancelProgrammaticScroll]);

  const revealTimelinePanel = useCallback(() => {
    if (panelRevealStartedRef.current) return;
    panelRevealStartedRef.current = true;
    setFrozenPanelIndex(null);
    setPanelTransitionActive(true);
  }, []);

  useEffect(() => {
    if (!panelTransitionActive) return;
    const timer = window.setTimeout(() => setPanelTransitionActive(false), 240);
    return () => clearTimeout(timer);
  }, [panelTransitionActive]);

  const scrollToProgress = useCallback(
    (progress: number) => {
      const container = containerRef.current;
      if (!container || feedEvents.length === 0) return;

      const slideWidth = container.clientWidth;
      if (slideWidth <= 0) return;

      scrollAnimRef.current?.cancel();
      scrollAnimRef.current = null;
      isAnimatingScrollRef.current = false;

      const clamped = Math.max(0, Math.min(progress, feedEvents.length - 1));
      container.scrollLeft = slideWidth * clamped;
      syncFromContainer(container);
    },
    [feedEvents.length, syncFromContainer]
  );

  const scrollToIndex = useCallback(
    (index: number, behavior: ScrollBehavior = "auto") => {
      const container = containerRef.current;
      if (!container || feedEvents.length === 0) return;

      const slideWidth = container.clientWidth;
      if (slideWidth <= 0) return;

      const clamped = Math.max(0, Math.min(index, feedEvents.length - 1));
      const targetLeft = slideWidth * clamped;

      scrollAnimRef.current?.cancel();
      scrollAnimRef.current = null;

      if (behavior === "auto") {
        finishTimelineJump();
        container.scrollLeft = targetLeft;
        syncFromContainer(container);
        return;
      }

      isAnimatingScrollRef.current = true;
      const startProgress = container.scrollLeft / slideWidth;
      scrollAnimRef.current = animateScrollLeft(container, targetLeft, {
        durationMs: timelineJumpDurationMs(startProgress, clamped),
        onUpdate: () => {
          syncFromContainer(container);
          const remaining = Math.abs(container.scrollLeft - targetLeft);
          if (remaining <= slideWidth * 0.08) {
            revealTimelinePanel();
          }
        },
        onComplete: () => {
          revealTimelinePanel();
          finishTimelineJump();
          syncFromContainer(container);
        },
      });
    },
    [feedEvents.length, finishTimelineJump, revealTimelinePanel, syncFromContainer]
  );

  const scrollToLatest = useCallback(
    (behavior: ScrollBehavior = "auto") => {
      if (feedEvents.length === 0) return;
      scrollToIndex(feedEvents.length - 1, behavior);
    },
    [feedEvents.length, scrollToIndex]
  );

  const feedEventIds = useMemo(() => feedEvents.map((event) => event.id), [feedEvents]);
  const {
    totals: engagementTotals,
    markers: engagementMarkers,
    refresh: refreshEngagement,
  } = useFeedEventEngagement(match.id, feedEventIds);

  const beginTimelineInteraction = useCallback(() => {
    if (followLatest) setFollowLatest(false);
    const currentIndex = Math.min(
      Math.max(Math.round(scrollProgress), 0),
      feedEvents.length - 1
    );
    setPanelTransitionActive(false);
    panelRevealStartedRef.current = false;
    setFrozenPanelIndex(currentIndex);
    setTimelineJumpActive(true);
  }, [feedEvents.length, followLatest, scrollProgress, setFollowLatest]);

  const handleTimelineScrubStart = useCallback(() => {
    isTimelineScrubbingRef.current = true;
    setTimelineScrubbing(true);
    beginTimelineInteraction();
  }, [beginTimelineInteraction]);

  const handleTimelineScrub = useCallback(
    (progress: number) => {
      scrollToProgress(progress);
    },
    [scrollToProgress]
  );

  const handleTimelineScrubEnd = useCallback(
    (index: number) => {
      isTimelineScrubbingRef.current = false;
      setTimelineScrubbing(false);
      scrollToIndex(index, "smooth");
    },
    [scrollToIndex]
  );

  const {
    bounds,
    score,
    htScore,
    pastFulltime,
    pastHalftime,
  } = useCompactMatchBarState(
    match.id,
    clock.isSynced,
    clock.matchTimeMs,
    clock.sync?.period
  );

  useEffect(() => {
    if (feedEvents.length === 0) return;
    setActiveIndex((index) => Math.min(index, feedEvents.length - 1));
  }, [feedEvents.length]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  useEffect(() => {
    if (
      hasScrolledToStart.current ||
      !containerRef.current ||
      feedEvents.length === 0 ||
      !followLatestLoaded
    ) {
      return;
    }

    const latestIndex = feedEvents.length - 1;
    let index = latestIndex;

    if (!followLatest && startEventId) {
      const startIndex = feedEvents.findIndex((e) => e.id === startEventId);
      if (startIndex >= 0) index = startIndex;
    }

    scrollToIndex(index);
    setActiveIndex(index);
    setScrollProgress(index);
    hasScrolledToStart.current = true;
  }, [
    feedEvents,
    startEventId,
    followLatest,
    followLatestLoaded,
    scrollToIndex,
  ]);

  useEffect(() => {
    if (!followLatestLoaded || !followLatest || feedEvents.length === 0) return;
    if (!hasScrolledToStart.current) return;

    scrollToLatest();
  }, [followLatest, followLatestLoaded, feedEvents.length, scrollToLatest]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || feedEvents.length === 0) return;

    syncFromContainer(container);

    let scrollEndTimer: ReturnType<typeof setTimeout> | undefined;

    const settleScroll = () => {
      if (isTimelineScrubbingRef.current) return;

      if (isAnimatingScrollRef.current) {
        if (!isUserSwipeRef.current) return;
        cancelProgrammaticScroll();
      }

      const slideWidth = container.clientWidth;
      if (slideWidth <= 0) return;

      const nearestIndex = Math.round(container.scrollLeft / slideWidth);
      const clamped = Math.max(0, Math.min(nearestIndex, feedEvents.length - 1));
      const targetLeft = slideWidth * clamped;

      if (followLatest && clamped < feedEvents.length - 1) {
        scrollToLatest("smooth");
        isUserSwipeRef.current = false;
        return;
      }

      if (Math.abs(container.scrollLeft - targetLeft) > 1) {
        container.scrollLeft = targetLeft;
      }

      if (isUserSwipeRef.current && clamped < feedEvents.length - 1) {
        setFollowLatest(false);
      }

      isUserSwipeRef.current = false;
      syncFromContainer(container);
    };

    const onScroll = () => {
      if (!isTimelineScrubbingRef.current) {
        if (isUserSwipeRef.current && isAnimatingScrollRef.current) {
          cancelProgrammaticScroll();
        } else if (!isAnimatingScrollRef.current) {
          isUserSwipeRef.current = true;
          setFrozenPanelIndex(null);
          setPanelTransitionActive(false);
          panelRevealStartedRef.current = false;
        }
      }
      syncFromContainer(container);
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(settleScroll, 80);
    };

    const onScrollEnd = () => {
      clearTimeout(scrollEndTimer);
      settleScroll();
    };

    const onTouchStart = () => {
      beginUserSwipe();
    };

    const onTouchEnd = () => {
      clearTimeout(scrollEndTimer);
      scrollEndTimer = setTimeout(settleScroll, 80);
    };

    container.addEventListener("scroll", onScroll, { passive: true });
    container.addEventListener("scrollend", onScrollEnd);
    container.addEventListener("touchstart", onTouchStart, { passive: true });
    container.addEventListener("touchend", onTouchEnd, { passive: true });
    container.addEventListener("touchcancel", onTouchEnd, { passive: true });

    return () => {
      container.removeEventListener("scroll", onScroll);
      container.removeEventListener("scrollend", onScrollEnd);
      container.removeEventListener("touchstart", onTouchStart);
      container.removeEventListener("touchend", onTouchEnd);
      container.removeEventListener("touchcancel", onTouchEnd);
      clearTimeout(scrollEndTimer);
      scrollAnimRef.current?.cancel();
    };
  }, [
    beginUserSwipe,
    cancelProgrammaticScroll,
    feedEvents.length,
    followLatest,
    scrollToLatest,
    setFollowLatest,
    syncFromContainer,
  ]);

  if (!clock.loaded || !displayName.loaded) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)] text-[var(--muted)] ${fullScreenSafeClass}`}>
        Loading...
      </div>
    );
  }

  if (!clock.isSynced) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 text-center ${fullScreenSafeClass}`}>
        <p className="text-[var(--muted)]">
          Kick off the match clock first to browse events in feed mode.
        </p>
        <Link
          href={`/match/${match.id}`}
          className={`rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black ${touchButtonClass}`}
        >
          Back to match
        </Link>
      </div>
    );
  }

  if (loading) {
    return (
      <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[var(--background)] text-[var(--muted)] ${fullScreenSafeClass}`}>
        Loading events...
      </div>
    );
  }

  if (error) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 text-center ${fullScreenSafeClass}`}>
        <p className="text-[var(--danger)]">{error}</p>
        <Link
          href={`/match/${match.id}`}
          className={`text-sm text-[var(--muted)] underline ${touchButtonClass}`}
        >
          Back to match
        </Link>
      </div>
    );
  }

  if (feedEvents.length === 0) {
    return (
      <div className={`fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-[var(--background)] px-6 text-center ${fullScreenSafeClass}`}>
        <p className="text-[var(--muted)]">
          No events unlocked yet at this point in the match.
        </p>
        <Link
          href={`/match/${match.id}`}
          className={`rounded-lg bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-black ${touchButtonClass}`}
        >
          Back to match
        </Link>
      </div>
    );
  }

  const safeActiveIndex = Math.min(
    Math.max(activeIndex, 0),
    feedEvents.length - 1
  );
  const panelIndex =
    frozenPanelIndex !== null ? frozenPanelIndex : safeActiveIndex;
  const panelEvent = feedEvents[panelIndex];
  const activeEvent = feedEvents[safeActiveIndex];
  const isOnLatest = safeActiveIndex === feedEvents.length - 1;
  const panelIsLatest = panelIndex === feedEvents.length - 1;

  return (
    <div className="fixed inset-0 z-50 bg-black">
      <div
        ref={backgroundRef}
        className="pointer-events-none absolute inset-0"
        style={{
          background: getEventFeedGradientFromTopColor(
            getEventFeedTopColor(activeEvent?.type ?? "commentary")
          ),
        }}
        aria-hidden
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(255,255,255,0.06)_0%,transparent_60%)]" />
      </div>

      <div className={`pointer-events-none fixed inset-x-0 top-0 z-[60] ${safeAreaInsetXClass} ${safeAreaTopClass}`}>
        <div className="relative w-full">
          <CompactMatchBar
            match={match}
            score={score}
            isSynced={clock.isSynced}
            isPaused={clock.isPaused}
            matchTimeMs={clock.matchTimeMs}
            syncedPeriod={clock.sync?.period}
            htScore={htScore}
            pastFulltime={pastFulltime}
            pastHalftime={pastHalftime}
            bounds={bounds}
            onSetClockFromPeriod={clock.setClockFromPeriod}
            onAdjustClock={clock.adjustClock}
            onResetClock={clock.resetClock}
            onPauseClock={clock.pauseClock}
            onResumeClock={clock.resumeClock}
            matchStatus={match.status}
            playbackRate={clock.playbackRate}
            isLivePace={clock.isLivePace}
            onSetPlaybackRate={clock.setPlaybackRate}
            onJumpToSecondHalf={clock.jumpToSecondHalf}
            onJumpToExtraTime={clock.jumpToExtraTime}
            onJumpToEtSecondHalf={clock.jumpToEtSecondHalf}
            backHref={`/match/${match.id}`}
            backLabel="← Match"
            theme="feed"
          />
          <button
            type="button"
            onClick={toggleFollowLatest}
            aria-pressed={followLatest}
            className={`pointer-events-auto absolute right-0 top-0 rounded-full border px-3 py-1.5 text-sm font-medium backdrop-blur-sm ${touchButtonClass} ${
              followLatest
                ? "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                : "border-white/15 bg-black/50 text-white/90 hover:text-white"
            }`}
            aria-label={
              followLatest
                ? "Following latest events. Turn off to browse older events."
                : "Follow latest events automatically"
            }
          >
            Latest
          </button>
        </div>
      </div>

      <div
        ref={containerRef}
        className={`relative z-10 flex h-[100dvh] w-full overflow-x-scroll overflow-y-hidden overscroll-x-contain [-webkit-overflow-scrolling:touch] ${
          timelineScrubbing ? "" : "snap-x snap-mandatory"
        }`}
      >
        {feedEvents.map((event, index) => {
          let slideStyle: CSSProperties | undefined;

          if (timelineJumpActive) {
            const distance = Math.abs(scrollProgress - index);
            const blend = Math.min(distance, 1);
            slideStyle = {
              transform: `scale(${1 - blend * 0.07})`,
              opacity: 1 - blend * 0.3,
            };
          }

          return (
            <div
              key={event.id}
              className="h-[100dvh] w-full min-w-full shrink-0 snap-start snap-always"
            >
              <div
                className={timelineJumpActive ? "h-full w-full will-change-transform" : "h-full w-full"}
                style={slideStyle}
              >
                <EventFeedSlide event={event} />
              </div>
            </div>
          );
        })}
      </div>

      <div
        id={FEED_EFFECTS_ROOT_ID}
        className="pointer-events-none fixed inset-0 z-[52] overflow-hidden"
        aria-hidden
      />

      {panelEvent && (
        <div className={`pointer-events-none absolute inset-x-0 bottom-0 z-[55] isolate bg-gradient-to-t from-black via-black/95 to-transparent pt-16 ${safeAreaInsetXClass} ${safeAreaBottomClass}`}>
          <FeedReactionTimeline
            events={feedEvents}
            engagementByEventId={engagementTotals}
            reactionMarkers={engagementMarkers}
            activeIndex={safeActiveIndex}
            scrollProgress={scrollProgress}
            onScrubStart={handleTimelineScrubStart}
            onScrub={handleTimelineScrub}
            onScrubEnd={handleTimelineScrubEnd}
            className="pointer-events-auto mb-4"
          />
          <EventFeedPanel
            event={panelEvent}
            authorName={displayName.name}
            isLatest={panelIsLatest}
            animateTransition={panelTransitionActive}
            onEngagementChange={refreshEngagement}
          />
        </div>
      )}

      {safeActiveIndex < feedEvents.length - 1 && !followLatest && (
        <div className="pointer-events-none absolute right-[max(1rem,env(safe-area-inset-right))] top-1/2 z-[60] -translate-y-1/2 animate-pulse text-white/40">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M5 12h14M13 6l6 6-6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}

      {safeActiveIndex > 0 && !followLatest && (
        <div className="pointer-events-none absolute left-[max(1rem,env(safe-area-inset-left))] top-1/2 z-[60] -translate-y-1/2 text-white/25">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path
              d="M19 12H5M11 6l-6 6 6 6"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      )}
    </div>
  );
}
