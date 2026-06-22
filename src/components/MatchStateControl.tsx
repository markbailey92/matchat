"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ClockSyncPanel } from "@/components/ClockSyncPanel";
import { formatMatchTime } from "@/lib/matchClock";
import { touchButtonClass } from "@/lib/layout";
import {
  inferPeriod,
  type MatchPeriod,
  type PeriodBoundaries,
} from "@/lib/matchPeriod";
import type { ReplayPlaybackRate } from "@/lib/matchPeriodAutomation";

interface MatchStateControlProps {
  matchId: string;
  isSynced: boolean;
  isPaused: boolean;
  matchTimeMs: number | null;
  syncedPeriod?: MatchPeriod;
  htScore?: { home: number; away: number } | null;
  pastFulltime?: boolean;
  pastHalftime?: boolean;
  bounds: PeriodBoundaries | null;
  matchStatus?: string;
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
  variant?: "default" | "feed" | "feed-inline";
}

const PANEL_MAX_WIDTH_PX = 352;
const VIEWPORT_PADDING_PX = 16;
const PANEL_GAP_PX = 8;

interface PanelPosition {
  top: number;
  left: number;
  width: number;
}

function matchStateLabel(
  isSynced: boolean,
  matchTimeMs: number | null,
  syncedPeriod: MatchPeriod | undefined,
  bounds: PeriodBoundaries | null,
  pastFulltime: boolean
): string {
  if (!isSynced || matchTimeMs === null) return "Kick off";

  if (pastFulltime) return "FT";

  const period =
    syncedPeriod ?? (bounds ? inferPeriod(matchTimeMs, bounds) : "1h");

  if (period === "ht") return "HT";
  if (period === "pens") return "Pens";

  return formatMatchTime(matchTimeMs);
}

function htScoreLine(
  htScore: { home: number; away: number } | null | undefined,
  pastHalftime: boolean,
  pastFulltime: boolean,
  syncedPeriod: MatchPeriod | undefined
): string | null {
  if (!htScore || !pastHalftime) return null;
  if (syncedPeriod === "ht" && !pastFulltime) return null;
  return `HT ${htScore.home}-${htScore.away}`;
}

export function MatchStateControl({
  matchId,
  isSynced,
  isPaused,
  matchTimeMs,
  syncedPeriod,
  htScore,
  pastFulltime = false,
  pastHalftime = false,
  bounds,
  matchStatus,
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
  variant = "default",
}: MatchStateControlProps) {
  const [open, setOpen] = useState(false);
  const [panelPosition, setPanelPosition] = useState<PanelPosition>({
    top: 0,
    left: 0,
    width: PANEL_MAX_WIDTH_PX,
  });
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const primary = useMemo(
    () =>
      matchStateLabel(
        isSynced,
        matchTimeMs,
        syncedPeriod,
        bounds,
        pastFulltime
      ),
    [isSynced, matchTimeMs, syncedPeriod, bounds, pastFulltime]
  );

  const htLine = useMemo(
    () => htScoreLine(htScore, pastHalftime, pastFulltime, syncedPeriod),
    [htScore, pastHalftime, pastFulltime, syncedPeriod]
  );

  const updatePanelPosition = useCallback(() => {
    const button = buttonRef.current;
    if (!button) return;

    const rect = button.getBoundingClientRect();
    const panel = panelRef.current;
    const width = Math.min(
      window.innerWidth - VIEWPORT_PADDING_PX * 2,
      PANEL_MAX_WIDTH_PX
    );
    const height = panel?.offsetHeight ?? 280;

    let top = rect.bottom + PANEL_GAP_PX;
    if (top + height > window.innerHeight - VIEWPORT_PADDING_PX) {
      top = Math.max(VIEWPORT_PADDING_PX, rect.top - height - PANEL_GAP_PX);
    }

    let left = rect.left + rect.width / 2 - width / 2;
    left = Math.max(
      VIEWPORT_PADDING_PX,
      Math.min(left, window.innerWidth - width - VIEWPORT_PADDING_PX)
    );

    setPanelPosition({ top, left, width });
  }, []);

  useLayoutEffect(() => {
    if (!open) return;
    updatePanelPosition();
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    const raf = requestAnimationFrame(updatePanelPosition);
    window.addEventListener("resize", updatePanelPosition);
    window.addEventListener("scroll", updatePanelPosition, true);

    const panel = panelRef.current;
    const resizeObserver =
      panel && typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(updatePanelPosition)
        : null;
    if (resizeObserver && panel) {
      resizeObserver.observe(panel);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", updatePanelPosition);
      window.removeEventListener("scroll", updatePanelPosition, true);
      resizeObserver?.disconnect();
    };
  }, [open, updatePanelPosition]);

  useEffect(() => {
    if (!open) return;

    const onPointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      if (buttonRef.current?.contains(target) || panelRef.current?.contains(target)) {
        return;
      }
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const panel =
    open && typeof document !== "undefined"
      ? createPortal(
          <>
            <div
              className="fixed inset-0 z-40 bg-black/30"
              aria-hidden
              onClick={() => setOpen(false)}
            />
            <div
              ref={panelRef}
              className="fixed z-50"
              style={{
                top: panelPosition.top,
                left: panelPosition.left,
                width: panelPosition.width,
              }}
            >
              <ClockSyncPanel
                matchId={matchId}
                matchStatus={matchStatus}
                isSynced={isSynced}
                isPaused={isPaused}
                currentMatchTimeMs={matchTimeMs}
                syncedPeriod={syncedPeriod}
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
                onReset={() => {
                  onReset();
                  setOpen(false);
                }}
                className="max-h-[min(70vh,calc(100vh-2rem))] overflow-y-auto rounded-xl border border-[var(--card-border)] bg-[var(--card)] px-3 py-2.5 shadow-xl"
              />
            </div>
          </>,
          document.body
        )
      : null;

  const isFeed = variant === "feed" || variant === "feed-inline";
  const isFeedInline = variant === "feed-inline";

  return (
    <div className="relative flex flex-col items-center">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="dialog"
        aria-label={
          isSynced
            ? `Match clock ${primary}${htLine ? `, ${htLine}` : ""}. Open sync controls.`
            : "Kick off — start match clock"
        }
        className={`flex flex-col items-center transition-colors ${touchButtonClass} ${
          isFeedInline
            ? "gap-0 rounded px-1.5 py-0"
            : "gap-0.5 rounded-md px-2 py-1"
        } ${
          isFeed
            ? open
              ? "bg-white/15"
              : "hover:bg-white/10"
            : open
              ? "bg-[var(--background)]/80"
              : "hover:bg-[var(--background)]/50"
        }`}
      >
        <span
          className={`font-bold tabular-nums ${
            isFeedInline ? "text-xs leading-none" : "text-sm"
          } ${
            isSynced
              ? "text-[var(--warning)]"
              : isFeed
                ? "text-white/70"
                : "text-[var(--muted)]"
          }`}
        >
          {primary}
        </span>
        {!isFeedInline && htLine && (
          <span className={`text-xs ${isFeed ? "text-white/60" : "text-[var(--muted)]"}`}>
            {htLine}
          </span>
        )}
        {(isFeedInline
          ? isSynced &&
            isPaused &&
            syncedPeriod !== "ht" &&
            syncedPeriod !== "pens"
          : isSynced &&
            isPaused &&
            syncedPeriod !== "ht" &&
            syncedPeriod !== "pens") && (
          <span className={`text-[var(--warning)] ${isFeedInline ? "text-[10px] leading-none" : "text-[10px]"}`}>
            Paused
          </span>
        )}
        {isFeedInline && isSynced && !isLivePace && (
          <span className="text-[10px] leading-none font-semibold text-white/70">
            {playbackRate}×
          </span>
        )}
      </button>
      {panel}
    </div>
  );
}
