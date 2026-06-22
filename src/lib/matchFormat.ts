import type { Match } from "@/lib/types";

const LIVE_STATUSES = new Set(["1H", "HT", "2H", "ET", "BT", "P", "LIVE", "INT"]);
const FINISHED_STATUSES = new Set(["FT", "AET", "PEN"]);

export function isLiveMatch(status?: string): boolean {
  return status ? LIVE_STATUSES.has(status) : false;
}

export function isFinishedMatch(status?: string): boolean {
  return status ? FINISHED_STATUSES.has(status) : false;
}

export function isUpcomingMatch(status?: string): boolean {
  return !status || status === "NS" || status === "TBD";
}

export function formatKickoff(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Short date for scoreboard header, e.g. "Mon 18 Dec 2022". */
export function formatMatchDate(iso?: string): string {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function statusLabel(status?: string): string {
  switch (status) {
    case "NS":
      return "Upcoming";
    case "1H":
      return "1st half";
    case "HT":
      return "Half time";
    case "2H":
      return "2nd half";
    case "ET":
      return "Extra time";
    case "P":
      return "Penalties";
    case "FT":
      return "Full time";
    case "AET":
      return "After extra time";
    case "PEN":
      return "Penalties";
    case "LIVE":
      return "Live";
    default:
      return status ?? "";
  }
}

export function matchTitle(match: Match): string {
  return `${match.homeTeam} vs ${match.awayTeam}`;
}
