"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";
import {
  emptyReactionCounts,
  REACTIONS,
  REACTION_TYPES,
  type ReactionState,
} from "@/lib/reactions";
import {
  isPrimaryAutoPlayEvent,
  reportEventVisibility,
  subscribePrimaryAutoPlayEvent,
} from "@/lib/reactionAutoPlay";
import {
  beginReactionEffectSession,
  fireReactionEffect,
  fireReactionEffectsFromCounts,
  getReactionEffectSession,
  type ReactionEffectOptions,
} from "@/lib/reactionEffects";
import type { ReactionType } from "@/lib/types";
import { touchButtonClass } from "@/lib/layout";
import { ReactionIcon } from "./ReactionIcon";

interface EventReactionsProps {
  eventId: string;
  authorName: string;
  unlocked: boolean;
  variant?: "inline" | "feed";
  /** Timeline cards: mount effects inside this element */
  effectsRootRef?: RefObject<HTMLDivElement | null>;
  /** Feed mode: only play existing-reaction effects when this slide is active */
  isActive?: boolean;
}

function hasReactionCounts(counts: Record<ReactionType, number>) {
  return REACTION_TYPES.some((type) => (counts[type] ?? 0) > 0);
}

function resolveTimelineEffectOptions(
  isFeed: boolean,
  effectsRootRef?: RefObject<HTMLDivElement | null>
): ReactionEffectOptions | undefined {
  if (isFeed) return { layer: "behind-feed-panel" };
  const container = effectsRootRef?.current;
  return container ? { container } : undefined;
}

export function EventReactions({
  eventId,
  authorName,
  unlocked,
  variant = "inline",
  effectsRootRef,
  isActive,
}: EventReactionsProps) {
  const [state, setState] = useState<ReactionState>({
    counts: emptyReactionCounts(),
    userReaction: null,
  });
  const containerRef = useRef<HTMLDivElement>(null);
  const countsRef = useRef(state.counts);
  const isVisibleRef = useRef(isActive ?? false);
  const hasPlayedRevealRef = useRef(false);
  const reactionsLoadedRef = useRef(false);
  const loadGenerationRef = useRef(0);

  countsRef.current = state.counts;

  const isFeed = variant === "feed";

  const getEffectOptions = useCallback((): ReactionEffectOptions | undefined => {
    return resolveTimelineEffectOptions(isFeed, effectsRootRef);
  }, [isFeed, effectsRootRef]);

  const tryPlayExistingReactions = useCallback(() => {
    if (!unlocked || hasPlayedRevealRef.current || !isVisibleRef.current) return;
    if (!reactionsLoadedRef.current) return;
    if (!isFeed && !isPrimaryAutoPlayEvent(eventId)) return;

    const counts = countsRef.current;
    if (!hasReactionCounts(counts)) return;

    const options = getEffectOptions();
    if (!isFeed && !options?.container) return;

    hasPlayedRevealRef.current = true;
    fireReactionEffectsFromCounts(counts, undefined, {
      ...options,
      sessionId: getReactionEffectSession(),
    });
  }, [unlocked, isFeed, eventId, getEffectOptions]);

  const loadReactions = useCallback(() => {
    if (!unlocked) return;

    const generation = ++loadGenerationRef.current;
    reactionsLoadedRef.current = false;
    countsRef.current = emptyReactionCounts();
    setState({ counts: emptyReactionCounts(), userReaction: null });

    const query = authorName
      ? `?author=${encodeURIComponent(authorName)}`
      : "";
    fetch(`/api/events/${eventId}/reactions${query}`)
      .then((r) => r.json())
      .then((data) => {
        if (generation !== loadGenerationRef.current) return;
        if (!data?.counts) return;

        const next = data as ReactionState;
        reactionsLoadedRef.current = true;
        setState(next);
        countsRef.current = next.counts;
        tryPlayExistingReactions();
      })
      .catch(() => {});
  }, [eventId, authorName, unlocked, tryPlayExistingReactions]);

  useEffect(() => {
    hasPlayedRevealRef.current = false;
    reactionsLoadedRef.current = false;
  }, [eventId]);

  useEffect(() => {
    loadReactions();
  }, [loadReactions]);

  useEffect(() => {
    if (isFeed) return;
    return subscribePrimaryAutoPlayEvent((primaryId) => {
      if (primaryId !== eventId) {
        hasPlayedRevealRef.current = false;
        return;
      }
      tryPlayExistingReactions();
    });
  }, [eventId, isFeed, tryPlayExistingReactions]);

  useEffect(() => {
    if (isActive === undefined) return;

    isVisibleRef.current = isActive;
    if (!isActive) {
      hasPlayedRevealRef.current = false;
      return;
    }

    if (!reactionsLoadedRef.current || !hasReactionCounts(countsRef.current)) return;

    beginReactionEffectSession();
    tryPlayExistingReactions();
  }, [isActive, tryPlayExistingReactions]);

  useEffect(() => {
    if (isActive !== undefined || !unlocked) return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        isVisibleRef.current = entry.intersectionRatio >= 0.35;
        reportEventVisibility(
          eventId,
          entry.isIntersecting ? entry.intersectionRatio : 0
        );
        if (!entry.isIntersecting) {
          hasPlayedRevealRef.current = false;
        }
      },
      { threshold: [0, 0.15, 0.35, 0.5, 0.75, 1] }
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      reportEventVisibility(eventId, 0);
    };
  }, [isActive, unlocked, eventId]);

  const handleReaction = async (type: ReactionType) => {
    if (!unlocked || !authorName.trim()) return;

    const options = getEffectOptions();
    if (!isFeed && !options?.container) return;

    fireReactionEffect(type, undefined, options);

    try {
      const res = await fetch(`/api/events/${eventId}/reactions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ author: authorName.trim(), type }),
      });
      if (res.ok) {
        setState(await res.json());
      }
    } catch {
      // Counts are best-effort; effects already played on click.
    }
  };

  if (!unlocked) return null;

  return (
    <div
      ref={containerRef}
      className={isFeed ? "mt-3" : "mt-3 border-t border-[var(--card-border)] pt-3"}
    >
      {!isFeed && (
        <p className="mb-2 text-xs font-medium text-[var(--muted)]">React</p>
      )}
      <div className="flex flex-wrap gap-2">
        {REACTIONS.map(({ type, label }) => {
          const selected = state.userReaction === type;
          const count = state.counts[type];

          return (
            <button
              key={type}
              type="button"
              disabled={!authorName.trim()}
              onClick={() => handleReaction(type)}
              aria-label={`${label}${count > 0 ? `, ${count}` : ""}`}
              aria-pressed={selected}
              title={!authorName.trim() ? "Set your display name to react" : label}
              className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1.5 text-sm transition-colors disabled:opacity-40 ${touchButtonClass} ${
                selected
                  ? isFeed
                    ? "border-[var(--accent)] bg-[var(--accent)]/20 text-white"
                    : "border-[var(--accent)] bg-[var(--accent)]/15 text-[var(--accent)]"
                  : isFeed
                    ? "border-white/20 bg-black/30 text-white hover:border-white/40"
                    : "border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)] hover:border-[var(--accent)]/50"
              }`}
            >
              <ReactionIcon type={type} size={15} />
              {count > 0 && (
                <span className="text-xs font-medium tabular-nums">{count}</span>
              )}
            </button>
          );
        })}
      </div>
      {!authorName.trim() && (
        <p className={`mt-2 text-xs ${isFeed ? "text-white/50" : "text-[var(--muted)]"}`}>
          Set your display name to react.
        </p>
      )}
    </div>
  );
}
