export type EventType =
  | "kickoff"
  | "goal"
  | "yellow_card"
  | "red_card"
  | "substitution"
  | "foul"
  | "free_kick"
  | "corner_awarded"
  | "corner_taken"
  | "shot"
  | "shot_on_target"
  | "halftime"
  | "fulltime"
  | "commentary"
  | "lineup"
  | "officials";

export interface LineupPlayer {
  jerseyNumber: number;
  name: string;
  position: string;
}

export interface MatchEvent {
  id: string;
  matchId: string;
  type: EventType;
  matchTimeMs: number;
  title: string;
  description?: string;
  team?: "home" | "away";
  player?: string;
  assistPlayer?: string;
  /** Shown before kickoff; unlocks as soon as the clock is synced */
  prematch?: boolean;
  /** Estimated real-world time (ISO), derived from kickoff + match clock */
  wallTime?: string;
  /** TV broadcast clock ms (what the stream shows) */
  broadcastTimeMs?: number;
  /** StatsBomb period (1 = 1H, 2 = 2H, 3 = ET1, …) */
  statsbombPeriod?: number;
  /** Starting XI for lineup events */
  lineupPlayers?: LineupPlayer[];
  /** e.g. "4-2-3-1" */
  formation?: string;
}

export interface Comment {
  id: string;
  eventId: string;
  author: string;
  text: string;
  createdAt: string;
}

export type ReactionType =
  | "clap"
  | "fire"
  | "wow"
  | "goal"
  | "heart"
  | "fireworks"
  | "confetti";

export interface EventReaction {
  id: string;
  eventId: string;
  author: string;
  type: ReactionType;
  createdAt: string;
}

export interface Match {
  id: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number;
  awayScore: number;
  competition: string;
  round?: string;
  kickoff?: string;
  status?: string;
  venue?: string;
  homeLogo?: string;
  awayLogo?: string;
}

import type { MatchPeriod } from "./matchPeriod";

export interface ClockSync {
  /** Wall-clock timestamp when sync was set */
  syncedAt: number;
  /** Match clock elapsed ms at sync moment */
  matchTimeAtSyncMs: number;
  /** Whether the match clock is paused (halftime, etc.) */
  paused: boolean;
  /** Period the user synced from (for display) */
  period?: MatchPeriod;
  /** When true, HT / ET breaks and period changes are applied automatically */
  autoPeriod?: boolean;
  /** Wall time when the current pause started (for break timers) */
  pausedAtWallMs?: number;
  /** Match ms advanced per real ms (1 = live TV pace). */
  playbackRate?: number;
  /** Which period-start events were already in the feed when a break pause began. */
  breakSnapshot?: {
    secondHalf: boolean;
    et1: boolean;
    et2: boolean;
  };
}
