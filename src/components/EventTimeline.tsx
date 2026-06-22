"use client";

import Link from "next/link";
import { useEffect } from "react";
import {
  type MatchPeriod,
} from "@/lib/matchPeriod";
import { useUnlockedMatchEvents } from "@/hooks/useUnlockedMatchEvents";
import { touchButtonClass } from "@/lib/layout";
import { EventCard } from "./EventCard";

interface EventTimelineProps {
  matchId: string;
  matchTimeMs: number | null;
  syncedPeriod?: MatchPeriod;
  isSynced: boolean;
  authorName: string;
  pollIntervalMs?: number;
}

export function EventTimeline({
  matchId,
  matchTimeMs,
  syncedPeriod,
  isSynced,
  authorName,
  pollIntervalMs,
}: EventTimelineProps) {
  const { visibleEvents, loading, error, newestJustUnlockedId } =
    useUnlockedMatchEvents({
      matchId,
      matchTimeMs,
      syncedPeriod,
      isSynced,
      pollIntervalMs,
    });

  useEffect(() => {
    if (!newestJustUnlockedId) return;
    document
      .getElementById(`event-${newestJustUnlockedId}`)
      ?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [newestJustUnlockedId]);

  if (loading) {
    return (
      <div className="py-12 text-center text-[var(--muted)]">Loading events...</div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-[var(--card-border)] bg-[var(--card)] p-6 text-center">
        <p className="text-[var(--danger)]">{error}</p>
      </div>
    );
  }

  if (!isSynced) {
    return (
      <div className="rounded-xl border border-dashed border-[var(--card-border)] py-12 text-center">
        <p className="text-[var(--muted)]">Kick off the match clock to reveal events as they happen.</p>
      </div>
    );
  }

  const unlockedCount = visibleEvents.length;

  return (
    <section>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium uppercase tracking-wide text-[var(--muted)]">
          Match events
        </h2>
        <div className="flex items-center gap-2">
          <span className="text-xs text-[var(--muted)]">
            {unlockedCount} revealed
          </span>
          {unlockedCount > 0 && (
            <Link
              href={`/match/${matchId}/feed`}
              className={`group inline-flex items-center gap-2.5 rounded-full border border-[var(--accent)]/35 bg-[var(--accent)]/10 px-3.5 py-2 text-xs font-semibold text-[var(--accent)] shadow-[0_0_20px_rgba(34,197,94,0.12)] transition-all hover:border-[var(--accent)]/60 hover:bg-[var(--accent)]/15 hover:shadow-[0_0_28px_rgba(34,197,94,0.22)] active:scale-[0.98] ${touchButtonClass}`}
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-black shadow-sm transition-transform group-hover:scale-105">
                <svg
                  width="14"
                  height="14"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden
                >
                  <rect
                    x="3"
                    y="5"
                    width="14"
                    height="14"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="2"
                  />
                  <path
                    d="M21 9v10a2 2 0 0 1-2 2H9"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <path
                    d="M17 3h4v4"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M21 3l-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
              <span>Feed mode</span>
            </Link>
          )}
        </div>
      </div>
      <div className="space-y-3">
        {visibleEvents.length === 0 ? (
          <div className="rounded-xl border border-dashed border-[var(--card-border)] py-8 text-center text-sm text-[var(--muted)]">
            No events revealed yet at this point in the match.
          </div>
        ) : (
          <>
            {visibleEvents.some((e) => e.prematch) && (
              <p className="text-xs text-[var(--muted)]">
                Pre-match events unlock as soon as you sync the clock.
              </p>
            )}
            {visibleEvents.map((event) => (
              <EventCard
                key={event.id}
                matchId={matchId}
                event={event}
                unlocked
                justUnlocked={event.id === newestJustUnlockedId}
                authorName={authorName}
              />
            ))}
          </>
        )}
      </div>
    </section>
  );
}
