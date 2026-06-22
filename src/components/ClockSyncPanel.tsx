"use client";

import { useEffect, useState } from "react";
import type { MatchEvent } from "@/lib/types";
import { formatMatchTime, parseMatchTimeInput } from "@/lib/matchClock";
import { touchButtonClass, touchInputClass } from "@/lib/layout";
import { isFinishedMatch, isLiveMatch } from "@/lib/matchFormat";
import {
  extractPeriodBoundaries,
  inferPeriod,
  type MatchPeriod,
  type PeriodBoundaries,
} from "@/lib/matchPeriod";

import {
  REPLAY_PLAYBACK_RATES,
  type ReplayPlaybackRate,
} from "@/lib/matchPeriodAutomation";

interface ClockSyncPanelProps {
  matchId: string;
  matchStatus?: string;
  isSynced: boolean;
  isPaused: boolean;
  currentMatchTimeMs: number | null;
  syncedPeriod?: MatchPeriod;
  playbackRate?: number;
  isLivePace?: boolean;
  onSetClockFromPeriod: (
    period: MatchPeriod,
    minutes: number,
    seconds: number,
    bounds: PeriodBoundaries
  ) => void;
  onAdjustClock: (deltaMs: number) => void;
  onPauseClock?: () => void;
  onResumeClock?: () => void;
  onSetPlaybackRate?: (rate: ReplayPlaybackRate) => void;
  onJumpToSecondHalf?: () => void;
  onJumpToExtraTime?: () => void;
  onJumpToEtSecondHalf?: () => void;
  onReset: () => void;
  className?: string;
}

const PERIOD_OPTIONS: MatchPeriod[] = ["1h", "ht", "2h", "et1", "et2", "pens"];

const PERIOD_SHORT: Record<MatchPeriod, string> = {
  "1h": "1H",
  ht: "HT",
  "2h": "2H",
  et1: "ET1",
  et2: "ET2",
  pens: "Pens",
};

const ADJUST_STEP_MS = 1000;

const adjustButtonClass = `flex h-11 w-11 shrink-0 items-center justify-center rounded-md border border-[var(--card-border)] bg-[var(--background)] text-lg font-medium text-[var(--foreground)] hover:border-[var(--accent)] sm:h-9 sm:w-9 sm:text-base ${touchButtonClass}`;

const jumpButtonClass = `rounded-md border border-[var(--card-border)] bg-[var(--background)] px-3 py-2 text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent)] ${touchButtonClass}`;

function splitTimeInput(value: string): { minutes: number; seconds: number } | null {
  const ms = parseMatchTimeInput(value);
  if (ms === null) return null;
  const totalSeconds = Math.floor(ms / 1000);
  return {
    minutes: Math.floor(totalSeconds / 60),
    seconds: totalSeconds % 60,
  };
}

export function ClockSyncPanel({
  matchId,
  matchStatus,
  isSynced,
  isPaused,
  currentMatchTimeMs,
  syncedPeriod,
  playbackRate = 1,
  isLivePace = true,
  onSetClockFromPeriod,
  onAdjustClock,
  onPauseClock,
  onResumeClock,
  onSetPlaybackRate,
  onJumpToSecondHalf,
  onJumpToExtraTime,
  onJumpToEtSecondHalf,
  onReset,
  className,
}: ClockSyncPanelProps) {
  const [period, setPeriod] = useState<MatchPeriod>("1h");
  const [timeInput, setTimeInput] = useState("0:00");
  const [error, setError] = useState<string | null>(null);
  const [bounds, setBounds] = useState<PeriodBoundaries | null>(null);

  useEffect(() => {
    fetch(`/api/matches/${matchId}/events`)
      .then(async (r) => {
        if (!r.ok) return;
        const events = (await r.json()) as MatchEvent[];
        if (Array.isArray(events)) {
          setBounds(extractPeriodBoundaries(events));
        }
      })
      .catch(() => {});
  }, [matchId]);

  const handleKickOff = () => {
    if (!bounds) return;
    setError(null);
    onSetClockFromPeriod("1h", 0, 0, bounds);
  };

  const handleSync = () => {
    if (!bounds) return;

    if (period === "ht" || period === "pens") {
      setError(null);
      onSetClockFromPeriod(period, 0, 0, bounds);
      return;
    }

    const parsed = splitTimeInput(timeInput);
    if (!parsed) {
      setError("Enter minutes and seconds (e.g. 4540)");
      return;
    }

    setError(null);
    onSetClockFromPeriod(period, parsed.minutes, parsed.seconds, bounds);
  };

  const timeDisabled = period === "ht" || period === "pens";
  const displayPeriod =
    isSynced && currentMatchTimeMs !== null && bounds
      ? syncedPeriod ?? inferPeriod(currentMatchTimeMs, bounds)
      : null;

  const live = isLiveMatch(matchStatus);
  const finished = isFinishedMatch(matchStatus);
  const atHalftime = isSynced && syncedPeriod === "ht";
  const atPreEt =
    isSynced &&
    syncedPeriod === "2h" &&
    isPaused &&
    bounds != null &&
    currentMatchTimeMs != null &&
    currentMatchTimeMs >= bounds.regulationEndMs - 500;
  const atEtHalftime = isSynced && syncedPeriod === "et1" && isPaused;
  const isAutomatedBreakPause =
    atHalftime || atPreEt || atEtHalftime || syncedPeriod === "pens";
  const canPauseClock =
    isSynced && !isPaused && !isAutomatedBreakPause && !!onPauseClock;
  const canResumeClock =
    isSynced && isPaused && !isAutomatedBreakPause && !!onResumeClock;

  return (
    <section
      className={
        className ??
        "rounded-lg border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5 sm:px-3"
      }
    >
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        {!isSynced ? (
          <div className="flex w-full flex-col gap-2">
            <button
              type="button"
              onClick={handleKickOff}
              disabled={!bounds}
              className={`rounded-md bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-black disabled:opacity-40 ${touchButtonClass}`}
            >
              Kick off
            </button>
            <div className="flex flex-col gap-1.5 border-t border-[var(--card-border)] pt-2">
              <p className="text-xs font-medium text-[var(--muted)]">
                Or sync to your broadcast
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={period}
                  onChange={(e) => setPeriod(e.target.value as MatchPeriod)}
                  aria-label="Period"
                  className={`rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 outline-none focus:border-[var(--accent)] ${touchInputClass}`}
                >
                  {PERIOD_OPTIONS.map((p) => (
                    <option key={p} value={p}>
                      {PERIOD_SHORT[p]}
                    </option>
                  ))}
                </select>

                {!timeDisabled && (
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="4540"
                    value={timeInput}
                    onChange={(e) => setTimeInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSync()}
                    aria-label="Match time"
                    className={`w-[5.5rem] rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 font-mono tabular-nums outline-none focus:border-[var(--accent)] ${touchInputClass}`}
                  />
                )}

                <button
                  type="button"
                  onClick={handleSync}
                  disabled={!bounds}
                  className={`rounded-md border border-[var(--card-border)] bg-[var(--background)] px-4 py-2 text-sm font-medium text-[var(--foreground)] hover:border-[var(--accent)] disabled:opacity-40 ${touchButtonClass}`}
                >
                  Sync
                </button>
              </div>
            </div>
          </div>
        ) : (
        <div className="flex items-center gap-2">
          <select
            value={period}
            onChange={(e) => setPeriod(e.target.value as MatchPeriod)}
            aria-label="Period"
            className={`rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 outline-none focus:border-[var(--accent)] ${touchInputClass}`}
          >
            {PERIOD_OPTIONS.map((p) => (
              <option key={p} value={p}>
                {PERIOD_SHORT[p]}
              </option>
            ))}
          </select>

          {!timeDisabled && (
            <input
              type="text"
              inputMode="numeric"
              placeholder="4540"
              value={timeInput}
              onChange={(e) => setTimeInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSync()}
              aria-label="Match time"
              className={`w-[5.5rem] rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2 py-2 font-mono tabular-nums outline-none focus:border-[var(--accent)] ${touchInputClass}`}
            />
          )}

          <button
            onClick={handleSync}
            disabled={!bounds}
            className={`rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-black disabled:opacity-40 ${touchButtonClass}`}
          >
            Sync
          </button>
        </div>
        )}

        {isSynced && currentMatchTimeMs !== null && (
          <div className="flex items-center justify-between gap-2 border-t border-[var(--card-border)] pt-2 sm:ml-auto sm:border-0 sm:pt-0">
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => onAdjustClock(-ADJUST_STEP_MS)}
                aria-label="Back 1 second"
                className={adjustButtonClass}
              >
                −
              </button>
              <div className="flex min-w-[5.5rem] flex-col items-center px-1">
                <span className="font-mono text-base font-semibold tabular-nums text-[var(--accent)] sm:text-sm">
                  {formatMatchTime(currentMatchTimeMs)}
                </span>
                <span className="flex items-center gap-1 text-xs text-[var(--muted)]">
                  {displayPeriod && <span>{PERIOD_SHORT[displayPeriod]}</span>}
                  {!isLivePace && playbackRate > 1 && (
                    <span className="text-[var(--accent)]">{playbackRate}×</span>
                  )}
                  {isPaused && !isAutomatedBreakPause && (
                    <span className="text-[var(--warning)]">⏸</span>
                  )}
                </span>
              </div>
              <button
                type="button"
                onClick={() => onAdjustClock(ADJUST_STEP_MS)}
                aria-label="Forward 1 second"
                className={adjustButtonClass}
              >
                +
              </button>
            </div>
            <div className="flex items-center gap-2">
              {canPauseClock && (
                <button
                  type="button"
                  onClick={onPauseClock}
                  className={`rounded-md border border-[var(--card-border)] bg-[var(--background)] px-2.5 py-1.5 text-xs font-medium text-[var(--foreground)] hover:border-[var(--accent)] ${touchButtonClass}`}
                >
                  Pause
                </button>
              )}
              {canResumeClock && (
                <button
                  type="button"
                  onClick={onResumeClock}
                  className={`rounded-md bg-[var(--accent)] px-2.5 py-1.5 text-xs font-medium text-black ${touchButtonClass}`}
                >
                  Resume
                </button>
              )}
              <button
                onClick={onReset}
                className={`text-xs text-[var(--muted)] underline-offset-2 hover:underline ${touchButtonClass} px-2`}
              >
                Reset
              </button>
            </div>
          </div>
        )}

        {isSynced && atHalftime && live && (
          <p className="w-full text-xs text-[var(--muted)]">
            Half time — waiting for kick-off in the event feed.
          </p>
        )}

        {isSynced && finished && atHalftime && onJumpToSecondHalf && (
          <div className="w-full border-t border-[var(--card-border)] pt-2">
            <button
              type="button"
              onClick={onJumpToSecondHalf}
              className={jumpButtonClass}
            >
              Jump to 2nd half
            </button>
          </div>
        )}

        {isSynced && finished && atPreEt && onJumpToExtraTime && (
          <div className="w-full border-t border-[var(--card-border)] pt-2">
            <button
              type="button"
              onClick={onJumpToExtraTime}
              className={jumpButtonClass}
            >
              Jump to extra time
            </button>
          </div>
        )}

        {isSynced && finished && atEtHalftime && onJumpToEtSecondHalf && (
          <div className="w-full border-t border-[var(--card-border)] pt-2">
            <button
              type="button"
              onClick={onJumpToEtSecondHalf}
              className={jumpButtonClass}
            >
              Jump to ET 2nd half
            </button>
          </div>
        )}

        {isSynced && onSetPlaybackRate && finished && (
          <div className="w-full border-t border-[var(--card-border)] pt-2">
            <p className="mb-2 text-xs font-medium text-[var(--foreground)]">
              Replay catch-up
            </p>
            <div className="flex flex-wrap gap-1.5">
              {REPLAY_PLAYBACK_RATES.map((rate) => (
                <button
                  key={rate}
                  type="button"
                  onClick={() => onSetPlaybackRate(rate)}
                  className={`rounded-md px-2.5 py-1.5 text-xs font-medium ${touchButtonClass} ${
                    playbackRate === rate
                      ? "bg-[var(--accent)] text-black"
                      : "border border-[var(--card-border)] bg-[var(--background)] text-[var(--foreground)]"
                  }`}
                  aria-pressed={playbackRate === rate}
                >
                  {rate === 1 ? "Live" : `${rate}×`}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {error && <p className="mt-1 text-xs text-[var(--danger)]">{error}</p>}
      <p className="mt-2 text-xs text-[var(--muted)]">
        {!isSynced
          ? live
            ? "Tap Kick off when the ref starts the match. Use Sync below if you're joining mid-game."
            : "Tap Kick off to start from the beginning, or sync to a specific broadcast time."
          : live
          ? "Live mode — sync once to your TV. Half time pauses until kick-off appears in the feed."
          : finished
            ? isLivePace
              ? "Replay — sync once and use Jump to 2nd half at half time, or speed up match time below."
              : "Catch-up mode — match time runs faster than real time. Use Live to sync with a broadcast again."
            : "Sync the clock to your broadcast. Period changes are applied automatically."}
      </p>
    </section>
  );
}
