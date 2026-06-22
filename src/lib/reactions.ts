import type { ReactionType } from "./types";

export const REACTIONS: { type: ReactionType; emoji: string; label: string }[] = [
  { type: "clap", emoji: "👏", label: "Applause" },
  { type: "fire", emoji: "🔥", label: "On fire" },
  { type: "wow", emoji: "😱", label: "Wow" },
  { type: "goal", emoji: "⚽", label: "Banger" },
  { type: "heart", emoji: "❤️", label: "Love it" },
  { type: "fireworks", emoji: "🎆", label: "Fireworks" },
  { type: "confetti", emoji: "🎉", label: "Confetti" },
];

export const REACTION_TYPES = REACTIONS.map((r) => r.type);

export function emptyReactionCounts(): Record<ReactionType, number> {
  return { clap: 0, fire: 0, wow: 0, goal: 0, heart: 0, fireworks: 0, confetti: 0 };
}

export interface ReactionState {
  counts: Record<ReactionType, number>;
  userReaction: ReactionType | null;
}

export function summarizeReactions(
  reactions: { author: string; type: ReactionType; createdAt: string }[],
  author?: string
): ReactionState {
  const counts = emptyReactionCounts();
  let userReaction: ReactionType | null = null;
  let latestUserClickAt = "";

  for (const reaction of reactions) {
    counts[reaction.type] += 1;
    if (author && reaction.author === author && reaction.createdAt >= latestUserClickAt) {
      latestUserClickAt = reaction.createdAt;
      userReaction = reaction.type;
    }
  }

  return { counts, userReaction };
}

export function reactionEmoji(type: ReactionType): string {
  return REACTIONS.find((reaction) => reaction.type === type)?.emoji ?? "•";
}
