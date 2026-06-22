import type { Comment, EventReaction, ReactionType } from "@/lib/types";
import { summarizeReactions, type ReactionState } from "@/lib/reactions";

const comments = new Map<string, Comment[]>();
const reactions = new Map<string, EventReaction[]>();

export function getComments(eventId: string): Comment[] {
  return comments.get(eventId) ?? [];
}

export function addComment(
  eventId: string,
  author: string,
  text: string
): Comment {
  const comment: Comment = {
    id: `c-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    eventId,
    author,
    text,
    createdAt: new Date().toISOString(),
  };
  const existing = comments.get(eventId) ?? [];
  comments.set(eventId, [...existing, comment]);
  return comment;
}

export function getEventReactions(eventId: string): EventReaction[] {
  return reactions.get(eventId) ?? [];
}

export function getReactionTotalsForEvents(
  eventIds: Iterable<string>
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const eventId of eventIds) {
    totals[eventId] = getEventReactions(eventId).length;
  }
  return totals;
}

/** Reactions + comments per event — used for feed engagement graph. */
export function getEngagementTotalsForEvents(
  eventIds: Iterable<string>
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const eventId of eventIds) {
    totals[eventId] =
      getEventReactions(eventId).length + getComments(eventId).length;
  }
  return totals;
}

export function addEventReactionClick(
  eventId: string,
  author: string,
  type: ReactionType
): ReactionState {
  const existing = reactions.get(eventId) ?? [];
  const next: EventReaction[] = [
    ...existing,
    {
      id: `r-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      eventId,
      author,
      type,
      createdAt: new Date().toISOString(),
    },
  ];

  reactions.set(eventId, next);
  return summarizeReactions(next, author);
}
