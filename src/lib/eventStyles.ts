import type { EventType } from "@/lib/types";

const EVENT_ICONS: Record<EventType, string> = {
  kickoff: "⚽",
  goal: "🥅",
  yellow_card: "🟨",
  red_card: "🟥",
  substitution: "🔄",
  foul: "⚠️",
  free_kick: "🎯",
  corner_awarded: "📐",
  corner_taken: "🚩",
  shot: "👟",
  shot_on_target: "🧤",
  halftime: "⏸",
  fulltime: "🏁",
  commentary: "💬",
  lineup: "📋",
  officials: "🧑‍⚖️",
};

const EVENT_COLORS: Record<EventType, string> = {
  kickoff: "border-l-slate-500",
  goal: "border-l-green-500",
  yellow_card: "border-l-yellow-500",
  red_card: "border-l-red-500",
  substitution: "border-l-blue-500",
  foul: "border-l-orange-500",
  free_kick: "border-l-amber-500",
  corner_awarded: "border-l-lime-500",
  corner_taken: "border-l-lime-600",
  shot: "border-l-slate-400",
  shot_on_target: "border-l-teal-500",
  halftime: "border-l-slate-400",
  fulltime: "border-l-slate-500",
  commentary: "border-l-purple-500",
  lineup: "border-l-cyan-500",
  officials: "border-l-indigo-500",
};

export function getEventIcon(type: EventType): string {
  return EVENT_ICONS[type];
}

export function getEventBorderColor(type: EventType): string {
  return EVENT_COLORS[type];
}

/** Top stop color for fullscreen feed backgrounds (#0a0f14 base is shared). */
const EVENT_FEED_TOP_COLORS: Record<EventType, string> = {
  kickoff: "#334155",
  goal: "#166534",
  yellow_card: "#854d0e",
  red_card: "#991b1b",
  substitution: "#1d4ed8",
  foul: "#c2410c",
  free_kick: "#b45309",
  corner_awarded: "#4d7c0f",
  corner_taken: "#3f6212",
  shot: "#475569",
  shot_on_target: "#0f766e",
  halftime: "#64748b",
  fulltime: "#475569",
  commentary: "#7e22ce",
  lineup: "#0e7490",
  officials: "#4338ca",
};

const FEED_GRADIENT_BASE = "#0a0f14";

export function getEventFeedTopColor(type: EventType): string {
  return EVENT_FEED_TOP_COLORS[type];
}

export function getEventFeedGradientFromTopColor(topColor: string): string {
  return `linear-gradient(180deg, ${topColor} 0%, ${FEED_GRADIENT_BASE} 70%)`;
}

function parseHexColor(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function channelToHex(value: number): string {
  return Math.round(value).toString(16).padStart(2, "0");
}

/** Blend two hex colors; t=0 → from, t=1 → to. */
export function lerpHexColor(from: string, to: string, t: number): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = parseHexColor(from);
  const [r2, g2, b2] = parseHexColor(to);
  return `#${channelToHex(r1 + (r2 - r1) * clamped)}${channelToHex(g1 + (g2 - g1) * clamped)}${channelToHex(b1 + (b2 - b1) * clamped)}`;
}

/** Fullscreen feed background gradient per event type. */
export function getEventFeedGradient(type: EventType): string {
  return getEventFeedGradientFromTopColor(getEventFeedTopColor(type));
}
