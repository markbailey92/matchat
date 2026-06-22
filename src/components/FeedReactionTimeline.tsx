"use client";

import { useCallback, useId, useLayoutEffect, useMemo, useRef, useState } from "react";
import type { MatchEvent } from "@/lib/types";
import type { ChartEngagementMarker } from "@/lib/engagement";
import {
  buildHeatmapPoints,
  buildPerEventEngagement,
  buildSmoothAreaPath,
  buildSmoothLinePath,
  interpolatePointAtProgress,
  progressFromChartX,
} from "@/lib/feedReactionTimeline";
import { touchButtonClass } from "@/lib/layout";
import { ReactionIcon } from "./ReactionIcon";

interface FeedReactionTimelineProps {
  events: MatchEvent[];
  engagementByEventId: Record<string, number>;
  reactionMarkers?: ChartEngagementMarker[];
  activeIndex: number;
  scrollProgress?: number;
  onScrubStart?: () => void;
  onScrub?: (progress: number) => void;
  onScrubEnd?: (index: number) => void;
  className?: string;
}

const CHART_HEIGHT = 40;
const MARKER_SIZE_PX = 22;
const MARKER_OVERLAP_PX = 11;
const MARKER_LIFT_PX = 8;

const LINE_STROKE = "rgba(255,255,255,0.45)";

export function FeedReactionTimeline({
  events,
  engagementByEventId,
  reactionMarkers = [],
  activeIndex,
  scrollProgress,
  onScrubStart,
  onScrub,
  onScrubEnd,
  className = "",
}: FeedReactionTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const scrubbingRef = useRef(false);
  const pointerIdRef = useRef<number | null>(null);
  const [width, setWidth] = useState(320);
  const areaGradientId = `engagement-area-${useId().replace(/:/g, "")}`;

  useLayoutEffect(() => {
    const node = containerRef.current;
    if (!node) return;

    const update = () => {
      const nextWidth = node.getBoundingClientRect().width;
      if (nextWidth > 0) {
        setWidth(Math.round(nextWidth));
      }
    };
    update();

    const observer = new ResizeObserver(update);
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const eventIds = useMemo(() => events.map((event) => event.id), [events]);
  const perEventEngagement = useMemo(
    () => buildPerEventEngagement(eventIds, engagementByEventId),
    [eventIds, engagementByEventId]
  );
  const points = useMemo(
    () => buildHeatmapPoints(perEventEngagement, width, CHART_HEIGHT),
    [perEventEngagement, width]
  );
  const areaPath = useMemo(
    () => buildSmoothAreaPath(points, CHART_HEIGHT),
    [points]
  );
  const linePath = useMemo(() => buildSmoothLinePath(points), [points]);
  const hasEngagement = perEventEngagement.some((value) => value > 0);

  const markerGroups = useMemo(() => {
    const groups = new Map<number, ChartEngagementMarker[]>();
    for (const marker of reactionMarkers) {
      const list = groups.get(marker.eventIndex) ?? [];
      list.push(marker);
      groups.set(marker.eventIndex, list);
    }

    return [...groups.entries()]
      .map(([eventIndex, markers]) => ({
        eventIndex,
        markers: [...markers].sort((a, b) => b.count - a.count),
      }))
      .sort((a, b) => a.eventIndex - b.eventIndex);
  }, [reactionMarkers]);

  const progressFromClientX = useCallback(
    (clientX: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return 0;
      const x = ((clientX - rect.left) / rect.width) * width;
      return progressFromChartX(x, events.length, width);
    },
    [events.length, width]
  );

  const finishScrub = useCallback(
    (clientX: number) => {
      if (!scrubbingRef.current) return;

      scrubbingRef.current = false;
      pointerIdRef.current = null;
      const progress = progressFromClientX(clientX);
      onScrubEnd?.(
        Math.max(0, Math.min(Math.round(progress), events.length - 1))
      );
    },
    [events.length, onScrubEnd, progressFromClientX]
  );

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      scrubbingRef.current = true;
      pointerIdRef.current = event.pointerId;
      onScrubStart?.();
      onScrub?.(progressFromClientX(event.clientX));
    },
    [onScrub, onScrubStart, progressFromClientX]
  );

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (!scrubbingRef.current || event.pointerId !== pointerIdRef.current) {
        return;
      }
      event.preventDefault();
      onScrub?.(progressFromClientX(event.clientX));
    },
    [onScrub, progressFromClientX]
  );

  const onPointerUp = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerId !== pointerIdRef.current) return;
      event.currentTarget.releasePointerCapture(event.pointerId);
      finishScrub(event.clientX);
    },
    [finishScrub]
  );

  const onPointerCancel = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      if (event.pointerId !== pointerIdRef.current) return;
      finishScrub(event.clientX);
    },
    [finishScrub]
  );

  if (events.length === 0) return null;

  const playheadProgress = scrollProgress ?? activeIndex;
  const playheadPoint = interpolatePointAtProgress(points, playheadProgress);
  const playheadDistance = Math.abs(playheadProgress - Math.round(playheadProgress));
  const playheadScale = 1 + (1 - Math.min(playheadDistance * 2.5, 1)) * 0.35;

  return (
    <div
      ref={containerRef}
      className={`relative select-none ${className}`}
      style={{ height: CHART_HEIGHT + MARKER_SIZE_PX }}
    >
      <div
        role="slider"
        tabIndex={0}
        aria-label="Match interaction graph. Drag to scrub, release to snap to an event."
        aria-valuemin={0}
        aria-valuemax={Math.max(events.length - 1, 0)}
        aria-valuenow={activeIndex}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerCancel}
        className={`absolute inset-x-0 bottom-0 block w-full cursor-grab touch-none border-0 bg-transparent p-0 active:cursor-grabbing ${touchButtonClass}`}
        style={{ height: CHART_HEIGHT }}
      >
        <svg
          viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
          width={width}
          height={CHART_HEIGHT}
          className="block overflow-visible [transform:translateZ(0)] [shape-rendering:geometricPrecision] [-webkit-backface-visibility:hidden]"
          aria-hidden
        >
          {hasEngagement && (
            <>
              <defs>
                <linearGradient
                  id={areaGradientId}
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={CHART_HEIGHT}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop offset="0%" stopColor="white" stopOpacity={0.55} />
                  <stop offset="100%" stopColor="white" stopOpacity={0} />
                </linearGradient>
              </defs>
              <path
                d={areaPath}
                fill={`url(#${areaGradientId})`}
                stroke="none"
                shapeRendering="geometricPrecision"
              />
            </>
          )}
          <path
            d={linePath}
            fill="none"
            stroke={LINE_STROKE}
            strokeWidth={1.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {playheadPoint && (
            <>
              <line
                x1={playheadPoint.x}
                y1={playheadPoint.y}
                x2={playheadPoint.x}
                y2={CHART_HEIGHT}
                stroke="var(--accent)"
                strokeWidth={1}
                strokeOpacity={0.35}
                strokeDasharray="2 3"
              />
              <circle
                cx={playheadPoint.x}
                cy={playheadPoint.y}
                r={3.5 * playheadScale}
                fill="var(--accent)"
                stroke="rgba(0,0,0,0.35)"
                strokeWidth={1}
              />
              <circle
                cx={playheadPoint.x}
                cy={playheadPoint.y}
                r={7 * playheadScale}
                fill="var(--accent)"
                fillOpacity={0.18}
                stroke="none"
              />
            </>
          )}
        </svg>
      </div>

      {markerGroups.map(({ eventIndex, markers }) => {
        const point = points[eventIndex];
        if (!point) return null;

        const left = (point.x / width) * 100;
        const top = ((point.y - MARKER_LIFT_PX) / CHART_HEIGHT) * 100;
        const stackWidth =
          MARKER_SIZE_PX + (markers.length - 1) * (MARKER_SIZE_PX - MARKER_OVERLAP_PX);

        return (
          <div
            key={eventIndex}
            aria-hidden
            className="pointer-events-none absolute flex items-center"
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: stackWidth,
              transform: "translate(-50%, -50%)",
            }}
          >
            {markers.map((marker, stackIndex) => (
              <span
                key={
                  marker.kind === "comment"
                    ? "comment"
                    : `reaction-${marker.type}`
                }
                title={
                  marker.kind === "comment"
                    ? `Most commented moment — ${marker.count} comment${marker.count === 1 ? "" : "s"}`
                    : `Top ${marker.emoji} moment — ${marker.count} on this event`
                }
                className="relative flex shrink-0 items-center justify-center rounded-full bg-neutral-700 text-sm leading-none shadow-md"
                style={{
                  width: MARKER_SIZE_PX,
                  height: MARKER_SIZE_PX,
                  marginLeft: stackIndex === 0 ? 0 : -MARKER_OVERLAP_PX,
                  zIndex: markers.length - stackIndex,
                }}
              >
                {marker.kind === "reaction" && marker.type ? (
                  <ReactionIcon type={marker.type} size={11} className="text-white" />
                ) : (
                  <span className="text-[11px]">{marker.emoji}</span>
                )}
              </span>
            ))}
          </div>
        );
      })}
    </div>
  );
}
