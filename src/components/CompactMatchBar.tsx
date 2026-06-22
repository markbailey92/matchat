"use client";

import Link from "next/link";
import { MatchStateControl } from "@/components/MatchStateControl";
import { TeamFlag } from "@/components/TeamFlag";
import { touchButtonClass } from "@/lib/layout";
import type { PeriodBoundaries, MatchPeriod } from "@/lib/matchPeriod";
import type { ReplayPlaybackRate } from "@/lib/matchPeriodAutomation";
import type { Match } from "@/lib/types";

interface CompactMatchBarProps {
  match: Match;
  score: { home: number; away: number } | null;
  isSynced: boolean;
  isPaused: boolean;
  matchTimeMs: number | null;
  syncedPeriod?: MatchPeriod;
  htScore?: { home: number; away: number } | null;
  pastFulltime?: boolean;
  pastHalftime?: boolean;
  bounds: PeriodBoundaries | null;
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
  matchStatus?: string;
  playbackRate?: number;
  isLivePace?: boolean;
  onSetPlaybackRate?: (rate: ReplayPlaybackRate) => void;
  onJumpToSecondHalf?: () => void;
  onJumpToExtraTime?: () => void;
  onJumpToEtSecondHalf?: () => void;
  backHref: string;
  backLabel?: string;
  theme?: "page" | "feed";
}

const feedPillBase =
  "pointer-events-auto border border-white/15 bg-black/50 px-3 text-sm font-medium text-white backdrop-blur-sm";

const feedBackPillClass = `${feedPillBase} rounded-full py-1.5`;
const feedScorePillClass = `${feedPillBase} rounded-2xl py-3`;

export function CompactMatchBar({
  match,
  score,
  isSynced,
  isPaused,
  matchTimeMs,
  syncedPeriod,
  htScore,
  pastFulltime = false,
  pastHalftime = false,
  bounds,
  onSetClockFromPeriod,
  onAdjustClock,
  onResetClock,
  onPauseClock,
  onResumeClock,
  matchStatus,
  playbackRate,
  isLivePace,
  onSetPlaybackRate,
  onJumpToSecondHalf,
  onJumpToExtraTime,
  onJumpToEtSecondHalf,
  backHref,
  backLabel = "←",
  theme = "page",
}: CompactMatchBarProps) {
  const isFeed = theme === "feed";
  const scoreLabel =
    score !== null ? `${score.home}–${score.away}` : "— – —";

  const clockControl = (
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
      matchStatus={matchStatus}
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
      variant={isFeed ? "feed" : "default"}
    />
  );

  if (isFeed) {
    return (
      <div className="relative w-full">
        <Link
          href={backHref}
          className={`${feedBackPillClass} relative z-10 shrink-0 ${touchButtonClass} text-white/90 hover:text-white`}
        >
          {backLabel}
        </Link>

        <div
          className={`${feedScorePillClass} absolute left-1/2 top-0 flex w-fit max-w-[calc(100%-11rem)] -translate-x-1/2 flex-col items-center gap-0.5`}
        >
          <div className="flex items-center justify-center gap-1.5 sm:gap-2">
            <TeamFlag teamName={match.homeTeam} className="h-4 w-6 shrink-0" />
            <span className="hidden max-w-[4rem] truncate text-xs font-semibold text-white/90 sm:inline">
              {match.homeTeam}
            </span>
            <span className="font-mono text-sm font-bold tabular-nums text-white">
              {scoreLabel}
            </span>
            <span className="hidden max-w-[4rem] truncate text-xs font-semibold text-white/90 sm:inline">
              {match.awayTeam}
            </span>
            <TeamFlag teamName={match.awayTeam} className="h-4 w-6 shrink-0" />
          </div>
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
            matchStatus={matchStatus}
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
            variant="feed-inline"
          />
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-2xl items-center gap-2 px-4 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-6">
      <Link
        href={backHref}
        className={`inline-flex shrink-0 items-center text-xs ${touchButtonClass} text-[var(--muted)] hover:text-[var(--foreground)]`}
      >
        {backLabel}
      </Link>

      <div className="flex min-w-0 flex-1 items-center justify-center gap-1.5 sm:gap-2">
        <TeamFlag teamName={match.homeTeam} className="h-4 w-6 shrink-0" />
        <span className="hidden max-w-[4.5rem] truncate text-xs font-semibold sm:inline">
          {match.homeTeam}
        </span>
        <span className="font-mono text-sm font-bold tabular-nums sm:text-base">
          {scoreLabel}
        </span>
        <span className="hidden max-w-[4.5rem] truncate text-xs font-semibold sm:inline">
          {match.awayTeam}
        </span>
        <TeamFlag teamName={match.awayTeam} className="h-4 w-6 shrink-0" />
      </div>

      <div className="shrink-0">{clockControl}</div>
    </div>
  );
}
