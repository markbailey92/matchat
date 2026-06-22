"use client";

import { EventTimeline } from "@/components/EventTimeline";
import { MatchHeader } from "@/components/MatchHeader";
import { useDisplayName } from "@/hooks/useDisplayName";
import { useMatchClock } from "@/hooks/useMatchClock";
import { pageShellClass } from "@/lib/layout";
import type { Match } from "@/lib/types";

interface MatchViewProps {
  match: Match;
}

export function MatchView({ match }: MatchViewProps) {
  const clock = useMatchClock(match.id, { matchStatus: match.status });
  const displayName = useDisplayName();

  if (!clock.loaded || !displayName.loaded) {
    return (
      <main className={`${pageShellClass} py-12 text-center text-[var(--muted)]`}>
        Loading...
      </main>
    );
  }

  return (
    <main className={pageShellClass}>
      <MatchHeader
        match={match}
        isSynced={clock.isSynced}
        isPaused={clock.isPaused}
        matchTimeMs={clock.matchTimeMs}
        syncedPeriod={clock.sync?.period}
        displayName={displayName.name}
        onSaveDisplayName={displayName.setName}
        onSetClockFromPeriod={clock.setClockFromPeriod}
        onAdjustClock={clock.adjustClock}
        onResetClock={clock.resetClock}
        onPauseClock={clock.pauseClock}
        onResumeClock={clock.resumeClock}
        playbackRate={clock.playbackRate}
        isLivePace={clock.isLivePace}
        onSetPlaybackRate={clock.setPlaybackRate}
        onJumpToSecondHalf={clock.jumpToSecondHalf}
        onJumpToExtraTime={clock.jumpToExtraTime}
        onJumpToEtSecondHalf={clock.jumpToEtSecondHalf}
      />

      <div className="mt-4 sm:mt-8">
        <EventTimeline
          matchId={match.id}
          matchTimeMs={clock.matchTimeMs}
          syncedPeriod={clock.sync?.period}
          isSynced={clock.isSynced}
          authorName={displayName.name}
          pollIntervalMs={match.status && ["1H", "HT", "2H", "ET", "P", "LIVE"].includes(match.status) ? 30_000 : undefined}
        />
      </div>
    </main>
  );
}
