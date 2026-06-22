"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useMatchEvents } from "@/hooks/useMatchEvents";
import { useCompactMatchBarState } from "@/hooks/useCompactMatchBarState";
import {
  formatMatchDate,
} from "@/lib/matchFormat";
import {
  extractAssists,
  extractScorers,
  formatScorerLine,
} from "@/lib/matchSummary";
import { filterUnlockedEvents } from "@/lib/eventUnlock";
import {
  type MatchPeriod,
} from "@/lib/matchPeriod";
import type { ReplayPlaybackRate } from "@/lib/matchPeriodAutomation";
import { TeamFlag } from "@/components/TeamFlag";
import { CompactMatchBar } from "@/components/CompactMatchBar";
import { DisplayNameSetup } from "@/components/DisplayNameSetup";
import { MatchStateControl } from "@/components/MatchStateControl";
import type { Match } from "@/lib/types";
import type { PeriodBoundaries } from "@/lib/matchPeriod";

interface MatchHeaderProps {
  match: Match;
  isSynced?: boolean;
  isPaused?: boolean;
  matchTimeMs?: number | null;
  syncedPeriod?: MatchPeriod;
  displayName: string;
  onSaveDisplayName: (name: string) => void;
  onSetClockFromPeriod: (
    period: MatchPeriod,
    minutes: number,
    seconds: number,
    bounds: PeriodBoundaries
  ) => void;
  onAdjustClock: (deltaMs: number) => void;
  onResetClock: () => void;
  onPauseClock?: () => void;
  onResumeClock?: () => void;
  playbackRate?: number;
  isLivePace?: boolean;
  onSetPlaybackRate?: (rate: ReplayPlaybackRate) => void;
  onJumpToSecondHalf?: () => void;
  onJumpToExtraTime?: () => void;
  onJumpToEtSecondHalf?: () => void;
}

function ScorerColumn({
  entries,
  align,
}: {
  entries: { player: string; minute: string }[];
  align: "left" | "right";
}) {
  if (entries.length === 0) return <div className="min-h-[1.25rem]" />;

  return (
    <p
      className={`text-sm leading-relaxed text-[var(--foreground)] ${
        align === "right" ? "text-right" : "text-left"
      }`}
    >
      {formatScorerLine(entries)}
    </p>
  );
}

export function MatchHeader({
  match,
  isSynced = false,
  isPaused = false,
  matchTimeMs = null,
  syncedPeriod,
  displayName,
  onSaveDisplayName,
  onSetClockFromPeriod,
  onAdjustClock,
  onResetClock,
  onPauseClock,
  onResumeClock,
  playbackRate,
  isLivePace,
  onSetPlaybackRate,
  onJumpToSecondHalf,
  onJumpToExtraTime,
  onJumpToEtSecondHalf,
}: MatchHeaderProps) {
  const { events } = useMatchEvents(match.id);

  const {
    bounds,
    score,
    htScore,
    pastFulltime,
    pastHalftime,
  } = useCompactMatchBarState(
    match.id,
    isSynced,
    matchTimeMs,
    syncedPeriod
  );

  const syncMs = isSynced && matchTimeMs !== null ? matchTimeMs : null;

  const unlockedEvents = useMemo(() => {
    if (syncMs === null || !bounds) return [];
    return filterUnlockedEvents(events, syncMs, syncedPeriod, bounds);
  }, [events, syncMs, syncedPeriod, bounds]);

  const scorers = useMemo(
    () => extractScorers(unlockedEvents, null),
    [unlockedEvents]
  );

  const assists = useMemo(
    () => extractAssists(unlockedEvents, null),
    [unlockedEvents]
  );

  const hasAssists = assists.home.length > 0 || assists.away.length > 0;
  const hasScorers = scorers.home.length > 0 || scorers.away.length > 0;

  const metaParts = [
    match.kickoff ? formatMatchDate(match.kickoff) : null,
    match.competition,
    match.round,
  ].filter(Boolean);

  const scoreboardRef = useRef<HTMLDivElement>(null);
  const [showCompactHeader, setShowCompactHeader] = useState(false);

  useEffect(() => {
    const target = scoreboardRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      ([entry]) => setShowCompactHeader(!entry.isIntersecting),
      { threshold: 0, rootMargin: "-1px 0px 0px 0px" }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, []);

  return (
    <>
      <div
        aria-hidden={!showCompactHeader}
        className={`fixed inset-x-0 top-0 z-30 transition-transform duration-200 ease-out ${
          showCompactHeader ? "translate-y-0" : "-translate-y-full pointer-events-none"
        }`}
      >
        <div className="border-b border-[var(--card-border)] bg-[var(--background)]/95 backdrop-blur-sm supports-[backdrop-filter]:bg-[var(--background)]/80">
          <CompactMatchBar
            match={match}
            score={score}
            isSynced={isSynced}
            isPaused={isPaused}
            matchTimeMs={matchTimeMs}
            syncedPeriod={syncedPeriod}
            htScore={htScore}
            pastFulltime={pastFulltime}
            pastHalftime={pastHalftime}
            bounds={bounds}
            onSetClockFromPeriod={onSetClockFromPeriod}
            onAdjustClock={onAdjustClock}
            onResetClock={onResetClock}
            onPauseClock={onPauseClock}
            onResumeClock={onResumeClock}
            matchStatus={match.status}
            playbackRate={playbackRate}
            isLivePace={isLivePace}
            onSetPlaybackRate={onSetPlaybackRate}
            onJumpToSecondHalf={onJumpToSecondHalf}
            onJumpToExtraTime={onJumpToExtraTime}
            onJumpToEtSecondHalf={onJumpToEtSecondHalf}
            backHref="/"
            backLabel="←"
            theme="page"
          />
        </div>
      </div>

      <header className="mb-4 sm:mb-6">
      <div className="flex items-center justify-between gap-3">
        <Link
          href="/"
          className="inline-flex min-h-11 shrink-0 items-center text-xs text-[var(--muted)] hover:text-[var(--foreground)] sm:min-h-0"
        >
          ← All fixtures
        </Link>
        <div className="flex min-w-0 justify-end">
          <DisplayNameSetup name={displayName} onSave={onSaveDisplayName} />
        </div>
      </div>

      <div
        ref={scoreboardRef}
        className="mt-3 rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-4 sm:px-5 sm:py-5"
      >
        {metaParts.length > 0 && (
          <p className="text-center text-xs text-[var(--muted)]">
            {metaParts.join(" · ")}
          </p>
        )}

        {/* Scoreboard */}
        <div className="mx-auto mt-4 grid w-full max-w-md grid-cols-[auto_1fr_auto] items-center gap-x-3 gap-y-1 sm:gap-x-4">
          <div className="flex justify-center">
            <TeamFlag
              teamName={match.homeTeam}
              className="h-6 w-9 shrink-0 sm:h-7 sm:w-10"
            />
          </div>

          <div className="flex items-center justify-center gap-2 sm:gap-3">
            {score !== null ? (
              <>
                <span className="font-mono text-4xl font-bold tabular-nums sm:text-5xl">
                  {score.home}
                </span>
                <div className="h-8 w-px bg-[var(--warning)] sm:h-10" aria-hidden />
                <span className="font-mono text-4xl font-bold tabular-nums sm:text-5xl">
                  {score.away}
                </span>
              </>
            ) : (
              <>
                <span className="font-mono text-2xl font-medium tabular-nums text-[var(--muted)] sm:text-3xl">
                  —
                </span>
                <div className="h-6 w-px bg-[var(--warning)]/60" aria-hidden />
                <span className="font-mono text-2xl font-medium tabular-nums text-[var(--muted)] sm:text-3xl">
                  —
                </span>
              </>
            )}
          </div>

          <div className="flex justify-center">
            <TeamFlag
              teamName={match.awayTeam}
              className="h-6 w-9 shrink-0 sm:h-7 sm:w-10"
            />
          </div>

          <div className="flex justify-center">
            <span className="max-w-[5rem] truncate text-center text-sm font-semibold sm:max-w-[6rem] sm:text-base">
              {match.homeTeam}
            </span>
          </div>

          <div className="flex justify-center">
            <MatchStateControl
              matchId={match.id}
              isSynced={isSynced}
              isPaused={isPaused}
              matchTimeMs={matchTimeMs}
              syncedPeriod={syncedPeriod}
              htScore={htScore}
              pastFulltime={pastFulltime}
              pastHalftime={pastHalftime}
              bounds={bounds}
              matchStatus={match.status}
              playbackRate={playbackRate}
              isLivePace={isLivePace}
              onSetClockFromPeriod={onSetClockFromPeriod}
              onAdjustClock={onAdjustClock}
              onPauseClock={onPauseClock}
              onResumeClock={onResumeClock}
              onSetPlaybackRate={onSetPlaybackRate}
              onJumpToSecondHalf={onJumpToSecondHalf}
              onJumpToExtraTime={onJumpToExtraTime}
              onJumpToEtSecondHalf={onJumpToEtSecondHalf}
              onReset={onResetClock}
            />
          </div>

          <div className="flex justify-center">
            <span className="max-w-[5rem] truncate text-center text-sm font-semibold sm:max-w-[6rem] sm:text-base">
              {match.awayTeam}
            </span>
          </div>
        </div>

        {/* Goal scorers */}
        {isSynced && hasScorers && (
          <div className="mt-4 grid grid-cols-2 gap-3 border-t border-[var(--card-border)] pt-3">
            <ScorerColumn entries={scorers.home} align="right" />
            <ScorerColumn entries={scorers.away} align="left" />
          </div>
        )}

        {/* Assists */}
        {isSynced && hasAssists && (
          <div className="mt-3 border-t border-[var(--card-border)] pt-3">
            <p className="mb-2 text-center text-sm font-semibold">Assists</p>
            <div className="grid grid-cols-2 gap-3">
              <ScorerColumn entries={assists.home} align="right" />
              <ScorerColumn entries={assists.away} align="left" />
            </div>
          </div>
        )}

        {/* Venue footer */}
        {match.venue && (
          <div className="mt-4 border-t border-[var(--card-border)] pt-3 text-center">
            <div className="mx-auto mb-2 h-px w-8 bg-[var(--warning)]/60" aria-hidden />
            <p className="text-xs text-[var(--muted)]">
              Venue:{" "}
              <span className="text-[var(--foreground)]">{match.venue}</span>
            </p>
          </div>
        )}
      </div>
    </header>
    </>
  );
}
