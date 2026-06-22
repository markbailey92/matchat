export function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

/** Fast initial travel, then a long gentle glide into the target. */
export function easeOutLongLanding(t: number): number {
  const timeSplit = 0.5;
  const progressSplit = 0.68;

  if (t <= timeSplit) {
    const phase = t / timeSplit;
    return progressSplit * (1 - Math.pow(1 - phase, 2));
  }

  const phase = (t - timeSplit) / (1 - timeSplit);
  return progressSplit + (1 - progressSplit) * (1 - Math.pow(1 - phase, 4));
}

/**
 * Most distance in the opening beat; the final ~65% of time is a slow coast in.
 * Feels clearly non-linear compared to easeOutLongLanding.
 */
export function easeOutDeepLanding(t: number): number {
  if (t >= 1) return 1;

  const cruiseEnd = 0.34;
  const cruiseProgress = 0.8;

  if (t <= cruiseEnd) {
    const phase = t / cruiseEnd;
    return cruiseProgress * (phase * phase * (3 - 2 * phase));
  }

  const phase = (t - cruiseEnd) / (1 - cruiseEnd);
  const landing = 1 - Math.pow(2, -8 * phase);
  return cruiseProgress + (1 - cruiseProgress) * landing;
}

export function timelineJumpDurationMs(
  startProgress: number,
  targetIndex: number
): number {
  const slideDistance = Math.abs(targetIndex - startProgress);
  return 920 + Math.min(slideDistance, 14) * 55;
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export interface ScrollAnimationHandle {
  cancel: () => void;
}

export function animateScrollLeft(
  element: HTMLElement,
  targetLeft: number,
  options: {
    durationMs?: number;
    /** Defaults to ease-out so the scroll decelerates into the target. */
    ease?: (t: number) => number;
    onUpdate?: () => void;
    onComplete?: () => void;
  } = {}
): ScrollAnimationHandle {
  const { durationMs = 920, ease = easeOutDeepLanding, onUpdate, onComplete } = options;

  if (prefersReducedMotion()) {
    element.scrollLeft = targetLeft;
    onUpdate?.();
    onComplete?.();
    return { cancel: () => {} };
  }

  const startLeft = element.scrollLeft;
  const distance = targetLeft - startLeft;

  if (Math.abs(distance) < 0.5) {
    onComplete?.();
    return { cancel: () => {} };
  }

  let frameId = 0;
  let cancelled = false;
  const startTime = performance.now();

  const step = (now: number) => {
    if (cancelled) return;

    const elapsed = now - startTime;
    const t = Math.min(1, elapsed / durationMs);
    element.scrollLeft = startLeft + distance * ease(t);
    onUpdate?.();

    if (t < 1) {
      frameId = requestAnimationFrame(step);
    } else {
      onComplete?.();
    }
  };

  frameId = requestAnimationFrame(step);

  return {
    cancel: () => {
      cancelled = true;
      cancelAnimationFrame(frameId);
    },
  };
}
