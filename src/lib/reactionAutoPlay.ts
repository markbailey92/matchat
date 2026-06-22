import { beginReactionEffectSession } from "@/lib/reactionEffects";

const MIN_VISIBLE_RATIO = 0.35;

let primaryEventId: string | null = null;
const visibilityByEvent = new Map<string, number>();
const listeners = new Set<(eventId: string | null) => void>();

function notifyPrimaryChange() {
  listeners.forEach((listener) => listener(primaryEventId));
}

function recomputePrimaryEvent() {
  let bestId: string | null = null;
  let bestRatio = 0;

  for (const [eventId, ratio] of visibilityByEvent) {
    if (ratio > bestRatio) {
      bestRatio = ratio;
      bestId = eventId;
    }
  }

  const nextPrimary = bestRatio >= MIN_VISIBLE_RATIO ? bestId : null;
  if (nextPrimary === primaryEventId) return;

  primaryEventId = nextPrimary;
  beginReactionEffectSession();
  notifyPrimaryChange();
}

export function reportEventVisibility(eventId: string, ratio: number) {
  if (ratio <= 0) {
    visibilityByEvent.delete(eventId);
  } else {
    visibilityByEvent.set(eventId, ratio);
  }
  recomputePrimaryEvent();
}

export function isPrimaryAutoPlayEvent(eventId: string) {
  return primaryEventId === eventId;
}

export function subscribePrimaryAutoPlayEvent(
  listener: (eventId: string | null) => void
) {
  listeners.add(listener);
  listener(primaryEventId);
  return () => {
    listeners.delete(listener);
  };
}
