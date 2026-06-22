"use client";

import { useRef } from "react";
import Link from "next/link";
import type { MatchEvent } from "@/lib/types";
import { formatBroadcastMatchTime } from "@/lib/matchClock";
import { getEventBorderColor, getEventIcon } from "@/lib/eventStyles";
import { FormationLineup } from "./FormationLineup";
import { CommentSection } from "./CommentSection";
import { EventReactions } from "./EventReactions";

interface EventCardProps {
  event: MatchEvent;
  matchId: string;
  unlocked: boolean;
  justUnlocked: boolean;
  authorName: string;
}

export function EventCard({ event, matchId, unlocked, justUnlocked, authorName }: EventCardProps) {
  const effectsRootRef = useRef<HTMLDivElement>(null);

  return (
    <div
      id={`event-${event.id}`}
      className={`relative overflow-hidden rounded-xl border border-[var(--card-border)] border-l-4 bg-[var(--card)] p-3 sm:p-4 transition-all duration-500 ${getEventBorderColor(event.type)} ${
        unlocked
          ? "opacity-100"
          : "pointer-events-none opacity-30 blur-[2px]"
      } ${justUnlocked ? "ring-2 ring-[var(--accent)] ring-offset-2 ring-offset-[var(--background)]" : ""}`}
    >
      <div
        ref={effectsRootRef}
        data-event-card-effects=""
        className="pointer-events-none absolute inset-0 z-20 overflow-hidden"
        aria-hidden
      />
      <div className="relative z-0 flex items-start gap-3">
        <span className="text-xl" aria-hidden>
          {getEventIcon(event.type)}
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-3">
            <div className="flex flex-wrap items-baseline gap-2">
              <span className="font-mono text-sm font-semibold tabular-nums text-[var(--accent)]">
                {event.prematch || event.matchTimeMs < 0
                  ? "Pre-match"
                  : formatBroadcastMatchTime(
                      event.broadcastTimeMs ?? event.matchTimeMs,
                      event.statsbombPeriod
                    )}
              </span>
              {!unlocked && (
                <span className="text-xs text-[var(--muted)]">Upcoming</span>
              )}
              {justUnlocked && (
                <span className="animate-pulse text-xs font-medium text-[var(--accent)]">
                  Live now
                </span>
              )}
            </div>
            {unlocked && (
              <Link
                href={`/match/${matchId}/feed?event=${encodeURIComponent(event.id)}`}
                className="shrink-0 text-xs font-medium text-[var(--muted)] hover:text-[var(--accent)]"
              >
                Open in feed
              </Link>
            )}
          </div>
          <h3 className="mt-1 font-semibold">{event.title}</h3>
          {event.assistPlayer && (
            <p className="mt-1 text-sm text-[var(--muted)]">
              Assist: {event.assistPlayer}
            </p>
          )}
          {event.type === "lineup" && event.lineupPlayers ? (
            <FormationLineup
              players={event.lineupPlayers}
              formation={event.formation}
            />
          ) : (
            event.description && (
              <p className="mt-1 text-sm text-[var(--muted)] whitespace-pre-line">
                {event.description}
              </p>
            )
          )}
          <EventReactions
            eventId={event.id}
            authorName={authorName}
            unlocked={unlocked}
            effectsRootRef={effectsRootRef}
          />
          <CommentSection eventId={event.id} unlocked={unlocked} authorName={authorName} />
        </div>
      </div>
    </div>
  );
}
