"use client";

import type { MatchEvent } from "@/lib/types";
import { formatBroadcastMatchTime } from "@/lib/matchClock";
import { getEventIcon } from "@/lib/eventStyles";
import { FormationLineup } from "./FormationLineup";

interface EventFeedSlideProps {
  event: MatchEvent;
}

export function EventFeedSlide({ event }: EventFeedSlideProps) {
  const timeLabel =
    event.prematch || event.matchTimeMs < 0
      ? "Pre-match"
      : formatBroadcastMatchTime(
          event.broadcastTimeMs ?? event.matchTimeMs,
          event.statsbombPeriod
        );

  return (
    <section
      className="relative flex h-[100dvh] w-full flex-col overflow-hidden bg-transparent pb-56"
      aria-label={`${event.title}, ${timeLabel}`}
    >
      <div className="relative z-10 flex flex-1 flex-col items-center justify-center px-6">
        {!(event.type === "lineup" && event.lineupPlayers) && (
          <span className="text-7xl drop-shadow-lg sm:text-8xl" aria-hidden>
            {getEventIcon(event.type)}
          </span>
        )}
        {event.type === "lineup" && event.lineupPlayers ? (
          <div className="w-full max-w-sm overflow-y-auto">
            <FormationLineup
              players={event.lineupPlayers}
              formation={event.formation}
            />
          </div>
        ) : null}
      </div>
    </section>
  );
}
