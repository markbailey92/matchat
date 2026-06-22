import type { ReactionType } from "@/lib/types";
import { reactionEmoji } from "@/lib/reactions";
import { FireworksIcon } from "./icons/FireworksIcon";

interface ReactionIconProps {
  type: ReactionType;
  size?: number;
  className?: string;
}

export function ReactionIcon({ type, size = 14, className = "" }: ReactionIconProps) {
  if (type === "fireworks") {
    return <FireworksIcon size={size} className={className} />;
  }

  return (
    <span className={`inline-flex leading-none ${className}`} aria-hidden>
      {reactionEmoji(type)}
    </span>
  );
}
