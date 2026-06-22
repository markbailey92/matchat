"use client";

import { useCallback, useEffect, useState } from "react";
import type { MatchEvent } from "@/lib/types";
import { formatBroadcastMatchTime } from "@/lib/matchClock";
import { getEventIcon } from "@/lib/eventStyles";
import { touchButtonClass } from "@/lib/layout";
import { prefersReducedMotion } from "@/lib/motion";
import { CommentSlidePanel } from "./CommentSlidePanel";
import { EventReactions } from "./EventReactions";

interface EventFeedPanelProps {
  event: MatchEvent;
  authorName: string;
  isLatest: boolean;
  animateTransition?: boolean;
  onEngagementChange?: () => void;
}

export function EventFeedPanel({
  event,
  authorName,
  isLatest,
  animateTransition = false,
  onEngagementChange,
}: EventFeedPanelProps) {
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [commentCount, setCommentCount] = useState(0);
  const [displayEvent, setDisplayEvent] = useState(event);
  const [contentVisible, setContentVisible] = useState(true);

  const timeLabel =
    displayEvent.prematch || displayEvent.matchTimeMs < 0
      ? "Pre-match"
      : formatBroadcastMatchTime(
          displayEvent.broadcastTimeMs ?? displayEvent.matchTimeMs,
          displayEvent.statsbombPeriod
        );

  useEffect(() => {
    if (event.id === displayEvent.id) return;

    if (!animateTransition || prefersReducedMotion()) {
      setDisplayEvent(event);
      setContentVisible(true);
      return;
    }

    setContentVisible(false);
    const swapTimer = window.setTimeout(() => {
      setDisplayEvent(event);
      requestAnimationFrame(() => setContentVisible(true));
    }, 40);

    return () => clearTimeout(swapTimer);
  }, [animateTransition, displayEvent.id, event]);

  useEffect(() => {
    setCommentsOpen(false);
    setCommentCount(0);

    fetch(`/api/events/${displayEvent.id}/comments`)
      .then((r) => r.json())
      .then((data) => {
        setCommentCount(Array.isArray(data) ? data.length : 0);
      })
      .catch(() => {});
  }, [displayEvent.id]);

  const handleCountChange = useCallback(
    (count: number) => {
      setCommentCount(count);
      onEngagementChange?.();
    },
    [onEngagementChange]
  );

  return (
    <>
      <div
        className={`pointer-events-auto relative z-[1] flex gap-4 ${
          animateTransition ? "transition-all duration-200 ease-out" : ""
        } ${
          contentVisible
            ? "translate-y-0 opacity-100"
            : animateTransition
              ? "translate-y-1 opacity-0"
              : "translate-y-0 opacity-100"
        }`}
      >
        <div className="min-w-0 flex-1">
            <p className="mt-1 font-mono text-sm font-semibold tabular-nums text-[var(--accent)]">
              {timeLabel}
            </p>
            <h2 className="mt-1 text-lg font-bold leading-snug text-white">
              {displayEvent.title}
            </h2>
            {displayEvent.assistPlayer && (
              <p className="mt-0.5 text-xs text-white/70">
                Assist: {displayEvent.assistPlayer}
              </p>
            )}
            {displayEvent.description &&
              displayEvent.type !== "lineup" &&
              !displayEvent.lineupPlayers && (
                <p className="mt-2 line-clamp-3 text-sm text-white/80">
                  {displayEvent.description}
                </p>
              )}
            <EventReactions
              eventId={displayEvent.id}
              authorName={authorName}
              unlocked
              variant="feed"
              isActive
              onEngagementChange={onEngagementChange}
            />
        </div>

        <div className="flex shrink-0 flex-col items-center gap-4 pt-1">
            <button
              type="button"
              onClick={() => setCommentsOpen(true)}
              className={`flex flex-col items-center gap-1 ${touchButtonClass}`}
              aria-label={`Open comments${commentCount > 0 ? `, ${commentCount} comments` : ""}`}
            >
              <span className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/30 text-lg backdrop-blur-sm">
                💬
              </span>
              <span className="text-[10px] font-medium tabular-nums text-white/80">
                {commentCount}
              </span>
            </button>

            <div className="flex h-11 w-11 items-center justify-center rounded-full border border-white/20 bg-black/30 text-xl backdrop-blur-sm">
              {getEventIcon(displayEvent.type)}
            </div>
            <p className="max-w-[3rem] text-center text-[10px] leading-tight text-white/60">
              {isLatest ? "Latest" : "Swipe →"}
            </p>
        </div>
      </div>

      <CommentSlidePanel
        open={commentsOpen}
        onClose={() => setCommentsOpen(false)}
        eventId={displayEvent.id}
        eventTitle={displayEvent.title}
        authorName={authorName}
        onCountChange={handleCountChange}
      />
    </>
  );
}
