import type { ReactionType } from "./types";
import {
  reactionEmoji,
  REACTION_TYPES,
  summarizeReactions,
} from "./reactions";
import { getComments, getEventReactions } from "./store";

export interface ChartEngagementMarker {
  kind: "reaction" | "comment";
  emoji: string;
  eventIndex: number;
  /** Reactions of this type, or comments, at the peak event. */
  count: number;
  type?: ReactionType;
}

/** @deprecated Use ChartEngagementMarker */
export type ChartReactionMarker = ChartEngagementMarker;

export interface EventEngagementData {
  totals: Record<string, number>;
  markers: ChartEngagementMarker[];
}

function engagementTotalsForEvents(
  eventIds: Iterable<string>
): Record<string, number> {
  const totals: Record<string, number> = {};
  for (const eventId of eventIds) {
    totals[eventId] =
      getEventReactions(eventId).length + getComments(eventId).length;
  }
  return totals;
}

export function getEngagementDataForEvents(
  eventIds: string[]
): EventEngagementData {
  const totals = engagementTotalsForEvents(eventIds);
  const peakForType: Partial<
    Record<ReactionType, { eventId: string; count: number }>
  > = {};

  for (const eventId of eventIds) {
    const counts = summarizeReactions(getEventReactions(eventId)).counts;
    for (const type of REACTION_TYPES) {
      const typeCount = counts[type];
      if (typeCount > (peakForType[type]?.count ?? 0)) {
        peakForType[type] = { eventId, count: typeCount };
      }
    }
  }

  const peaks = REACTION_TYPES.map((type) => {
    const peak = peakForType[type];
    if (!peak || peak.count <= 0) return null;
    const eventIndex = eventIds.indexOf(peak.eventId);
    if (eventIndex < 0) return null;
    return { type, eventIndex, count: peak.count };
  }).filter((entry): entry is NonNullable<typeof entry> => entry !== null);

  let topComment: { eventId: string; count: number } | null = null;
  for (const eventId of eventIds) {
    const commentCount = getComments(eventId).length;
    if (commentCount > (topComment?.count ?? 0)) {
      topComment = { eventId, count: commentCount };
    }
  }

  const markers: ChartEngagementMarker[] = peaks
    .map(({ type, eventIndex, count }) => ({
      kind: "reaction" as const,
      type,
      emoji: reactionEmoji(type),
      eventIndex,
      count,
    }))
    .sort((a, b) => b.count - a.count);

  if (topComment && topComment.count > 0) {
    const eventIndex = eventIds.indexOf(topComment.eventId);
    if (eventIndex >= 0) {
      markers.push({
        kind: "comment",
        emoji: "💬",
        eventIndex,
        count: topComment.count,
      });
    }
  }

  return { totals, markers };
}
