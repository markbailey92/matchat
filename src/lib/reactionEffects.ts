import confetti from "canvas-confetti";
import type { ReactionType } from "./types";
import { REACTION_TYPES } from "./reactions";

export interface ReactionEffectOrigin {
  x: number;
  y: number;
}

export type ReactionEffectLayer = "default" | "behind-feed-panel" | "event-card";

export interface ReactionEffectOptions {
  layer?: ReactionEffectLayer;
  /** When set, effects are clipped to this element (timeline event cards). */
  container?: HTMLElement | null;
  /** Stale auto-play batches are skipped when the session id changes. */
  sessionId?: number;
}

/** Mount point for feed-mode effects (between slides and bottom panel). */
export const FEED_EFFECTS_ROOT_ID = "feed-reaction-effects-root";

/** Normalised viewport origin for all reaction effects (bottom centre). */
export const REACTION_EFFECT_CENTER: ReactionEffectOrigin = { x: 0.5, y: 0.88 };

/** Origin just below the card bottom edge (clipped; motion rises into the card). */
export const EVENT_CARD_EFFECT_ORIGIN: ReactionEffectOrigin = { x: 0.5, y: 1.06 };

const DEFAULT_ORIGIN = REACTION_EFFECT_CENTER;

interface EffectBounds {
  width: number;
  height: number;
}

let activeLayer: ReactionEffectLayer = "default";
let activeContainer: HTMLElement | null = null;
let activeBounds: EffectBounds = { width: 0, height: 0 };
let effectSessionId = 0;
const pendingTimeouts = new Set<ReturnType<typeof setTimeout>>();
const activeAnimations = new Set<Animation>();
const activeRafHandles = new Set<number>();

export function getReactionEffectSession() {
  return effectSessionId;
}

export function beginReactionEffectSession() {
  cancelReactionEffects();
  effectSessionId += 1;
  return effectSessionId;
}

export function cancelReactionEffects() {
  pendingTimeouts.forEach(clearTimeout);
  pendingTimeouts.clear();
  activeRafHandles.forEach(cancelAnimationFrame);
  activeRafHandles.clear();
  activeAnimations.forEach((animation) => animation.cancel());
  activeAnimations.clear();

  document.querySelectorAll("[data-reaction-overlay]").forEach((node) => {
    node.innerHTML = "";
  });

  const defaultOverlay = overlays.get("default");
  if (defaultOverlay) defaultOverlay.innerHTML = "";

  document.querySelectorAll("canvas[data-confetti-canvas]").forEach((node) => {
    const canvas = node as HTMLCanvasElement;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  });

  if (typeof confetti.reset === "function") confetti.reset();
  feedConfetti?.reset?.();
}

function isSessionActive(sessionId?: number) {
  return sessionId === undefined || sessionId === effectSessionId;
}

function trackTimeout(id: ReturnType<typeof setTimeout>) {
  pendingTimeouts.add(id);
  return id;
}

function trackAnimation(animation: Animation) {
  activeAnimations.add(animation);
  animation.addEventListener("finish", () => activeAnimations.delete(animation));
  animation.addEventListener("cancel", () => activeAnimations.delete(animation));
}

function trackRaf(id: number) {
  activeRafHandles.add(id);
  return id;
}

function syncActiveBounds(container: HTMLElement | null) {
  if (container) {
    const rect = container.getBoundingClientRect();
    activeBounds = {
      width: Math.max(rect.width, 1),
      height: Math.max(rect.height, 1),
    };
    return;
  }

  activeBounds = {
    width: window.innerWidth,
    height: window.innerHeight,
  };
}

function setActiveEffectScope(options?: ReactionEffectOptions) {
  activeContainer = options?.container ?? null;
  activeLayer = activeContainer
    ? "event-card"
    : (options?.layer ?? "default");
  syncActiveBounds(activeContainer);
}

function vw(fraction: number) {
  return activeBounds.width * fraction;
}

function vh(fraction: number) {
  return activeBounds.height * fraction;
}

function vmin(fraction: number) {
  return Math.min(activeBounds.width, activeBounds.height) * fraction;
}

function screenFillScale(origin: ReactionEffectOrigin) {
  const { width, height } = activeBounds;
  const cx = origin.x * width;
  const cy = origin.y * height;
  const toEdge = Math.max(
    Math.hypot(cx, cy),
    Math.hypot(width - cx, cy),
    Math.hypot(cx, height - cy),
    Math.hypot(width - cx, height - cy)
  );
  return toEdge / 120;
}

function resolveEffectOrigin(
  origin: ReactionEffectOrigin | undefined,
  options?: ReactionEffectOptions
): ReactionEffectOrigin {
  if (origin !== undefined) return origin;
  if (options?.container?.dataset.eventCardEffects != null) {
    return EVENT_CARD_EFFECT_ORIGIN;
  }
  return DEFAULT_ORIGIN;
}

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function toPx(origin: ReactionEffectOrigin) {
  return {
    x: origin.x * activeBounds.width,
    y: origin.y * activeBounds.height,
  };
}

function rand(min: number, max: number) {
  return min + Math.random() * (max - min);
}

function pick<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

const overlays = new Map<ReactionEffectLayer, HTMLDivElement>();
const containerOverlays = new WeakMap<HTMLElement, HTMLDivElement>();
const containerConfetti = new WeakMap<
  HTMLElement,
  ReturnType<typeof confetti.create>
>();
let feedConfetti: ReturnType<typeof confetti.create> | null = null;

function getFeedEffectsRoot(): HTMLElement | null {
  return document.getElementById(FEED_EFFECTS_ROOT_ID);
}

function getContainerOverlay(container: HTMLElement): HTMLDivElement {
  let overlay = containerOverlays.get(container);
  if (!overlay || !container.contains(overlay)) {
    overlay = document.createElement("div");
    overlay.dataset.reactionOverlay = "true";
    overlay.style.cssText =
      "position:absolute;inset:0;pointer-events:none;overflow:hidden;z-index:1;";
    container.appendChild(overlay);
    containerOverlays.set(container, overlay);
  }
  return overlay;
}

function getOverlay(layer: ReactionEffectLayer = activeLayer): HTMLDivElement {
  if (activeContainer) {
    return getContainerOverlay(activeContainer);
  }

  if (layer === "behind-feed-panel") {
    const feedRoot = getFeedEffectsRoot();
    if (feedRoot) {
      return getContainerOverlay(feedRoot);
    }
  }

  let overlay = overlays.get("default");
  if (!overlay || !document.body.contains(overlay)) {
    overlay = document.createElement("div");
    overlay.id = "reaction-effects-overlay-default";
    overlay.style.cssText =
      "position:fixed;inset:0;pointer-events:none;z-index:9999;overflow:hidden;";
    document.body.appendChild(overlay);
    overlays.set("default", overlay);
  }
  return overlay;
}

function getScopedConfetti(root: HTMLElement) {
  let scoped = containerConfetti.get(root);
  if (!scoped) {
    let canvas = root.querySelector(
      "canvas[data-confetti-canvas]"
    ) as HTMLCanvasElement | null;
    if (!canvas) {
      canvas = document.createElement("canvas");
      canvas.dataset.confettiCanvas = "true";
      canvas.style.cssText =
        "position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:0;";
      root.insertBefore(canvas, root.firstChild);
    }
    scoped = confetti.create(canvas, { resize: true });
    containerConfetti.set(root, scoped);
  }
  return scoped;
}

function getConfettiFn() {
  if (activeContainer) {
    return getScopedConfetti(activeContainer);
  }

  if (activeLayer !== "behind-feed-panel") return confetti;

  const feedRoot = getFeedEffectsRoot();
  if (!feedRoot) return confetti;

  if (!feedConfetti) {
    feedConfetti = getScopedConfetti(feedRoot);
  }

  return feedConfetti;
}

function runAnimation(
  el: HTMLElement,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions
) {
  const anim = el.animate(keyframes, options);
  trackAnimation(anim);
  anim.onfinish = () => el.remove();
  anim.oncancel = () => el.remove();
}

function spawnEmoji(
  emoji: string,
  x: number,
  y: number,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions & { fontSize?: number } = {}
) {
  const el = document.createElement("span");
  el.textContent = emoji;
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = [
    "position:absolute",
    `left:${x}px`,
    `top:${y}px`,
    `font-size:${options.fontSize ?? 28}px`,
    "line-height:1",
    "transform:translate(-50%,-50%)",
    "will-change:transform,opacity",
  ].join(";");
  getOverlay().appendChild(el);
  runAnimation(el, keyframes, {
    duration: 800,
    easing: "ease-out",
    fill: "forwards",
    ...options,
  });
}

function spawnRing(
  x: number,
  y: number,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions & { size?: number; border?: string } = {}
) {
  const size = options.size ?? 24;
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = [
    "position:absolute",
    `left:${x}px`,
    `top:${y}px`,
    `width:${size}px`,
    `height:${size}px`,
    `border:${options.border ?? "3px solid rgba(255,255,255,0.85)"}`,
    "border-radius:50%",
    "box-sizing:border-box",
    "transform:translate(-50%,-50%)",
    "will-change:transform,opacity",
  ].join(";");
  getOverlay().appendChild(el);
  runAnimation(el, keyframes, {
    duration: 650,
    easing: "ease-out",
    fill: "forwards",
    ...options,
  });
}

function spawnGlow(
  x: number,
  y: number,
  color: string,
  keyframes: Keyframe[],
  options: KeyframeAnimationOptions = {}
) {
  const el = document.createElement("div");
  el.setAttribute("aria-hidden", "true");
  el.style.cssText = [
    "position:absolute",
    `left:${x}px`,
    `top:${y}px`,
    "width:28px",
    "height:28px",
    `background:${color}`,
    "border-radius:50%",
    "filter:blur(10px)",
    "transform:translate(-50%,-50%)",
    "will-change:transform,opacity",
  ].join(";");
  getOverlay().appendChild(el);
  runAnimation(el, keyframes, {
    duration: 900,
    easing: "ease-out",
    fill: "forwards",
    ...options,
  });
}

function clapEffect(origin: ReactionEffectOrigin) {
  const { x, y } = toPx(origin);
  const bursts = 18;

  for (let i = 0; i < bursts; i++) {
    const angle = -85 + (170 / (bursts - 1)) * i;
    const dist = rand(vmin(0.18), vmin(0.48));
    const rad = (angle * Math.PI) / 180;
    const dx = Math.cos(rad) * dist;
    const dy = Math.sin(rad) * dist - rand(vh(0.02), vh(0.12));

    spawnEmoji(
      "👏",
      x + rand(-vw(0.04), vw(0.04)),
      y + rand(-vh(0.02), vh(0.02)),
      [
        { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0 },
        {
          transform: "translate(-50%, -50%) scale(1.4)",
          opacity: 1,
          offset: 0.18,
        },
        {
          transform: `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px)) scale(1.05)`,
          opacity: 0,
        },
      ],
      { duration: rand(750, 950), delay: i * 35, fontSize: rand(vmin(0.06), vmin(0.11)) }
    );
  }
}

function fireEffect(origin: ReactionEffectOrigin) {
  const { x, y } = toPx(origin);
  const flames = 16;

  for (let i = 0; i < flames; i++) {
    const drift = rand(-vw(0.35), vw(0.35));
    const rise = rand(vh(0.25), vh(0.65));
    const startX = x + rand(-vw(0.25), vw(0.25));

    spawnEmoji(
      "🔥",
      startX,
      y + rand(0, vh(0.04)),
      [
        {
          transform: "translate(-50%, -50%) scale(0.5)",
          opacity: 0.9,
        },
        {
          transform: `translate(calc(-50% + ${drift * 0.35}px), calc(-50% - ${rise * 0.4}px)) scale(1.15)`,
          opacity: 1,
          offset: 0.35,
        },
        {
          transform: `translate(calc(-50% + ${drift}px), calc(-50% - ${rise}px)) scale(0.85)`,
          opacity: 0,
        },
      ],
      {
        duration: rand(1000, 1400),
        delay: i * 55,
        fontSize: rand(vmin(0.07), vmin(0.13)),
      }
    );

    spawnGlow(
      startX + rand(-vw(0.02), vw(0.02)),
      y + rand(0, vh(0.03)),
      pick(["rgba(249,115,22,0.75)", "rgba(239,68,68,0.7)", "rgba(251,191,36,0.6)"]),
      [
        { transform: "translate(-50%, -50%) scale(0.8)", opacity: 0.85 },
        {
          transform: `translate(calc(-50% + ${drift * 0.45}px), calc(-50% - ${rise * 0.55}px)) scale(${rand(2.5, 4.5)})`,
          opacity: 0,
        },
      ],
      { duration: rand(900, 1200), delay: i * 55 }
    );
  }
}

function wowEffect(origin: ReactionEffectOrigin) {
  const { x, y } = toPx(origin);
  const ringScale = screenFillScale(origin) * 1.1;

  spawnRing(
    x,
    y,
    [
      { transform: "translate(-50%, -50%) scale(0.3)", opacity: 0.95 },
      { transform: `translate(-50%, -50%) scale(${ringScale})`, opacity: 0 },
    ],
    { border: "5px solid rgba(199,210,254,0.85)", duration: 900, size: 40 }
  );

  spawnRing(
    x,
    y,
    [
      { transform: "translate(-50%, -50%) scale(0.15)", opacity: 0.75 },
      { transform: `translate(-50%, -50%) scale(${ringScale * 0.65})`, opacity: 0 },
    ],
    { border: "3px solid rgba(255,255,255,0.65)", duration: 650, delay: 100, size: 40 }
  );

  const rise = rand(vh(0.45), vh(0.7));
  const drift = rand(-vw(0.08), vw(0.08));

  spawnEmoji(
    "😱",
    x + drift * 0.3,
    y,
    [
      { transform: "translate(-50%, -50%) scale(0.2)", opacity: 0 },
      { transform: "translate(-50%, -50%) scale(1.45)", opacity: 1, offset: 0.15 },
      {
        transform: `translate(calc(-50% + ${drift}px), calc(-50% - ${rise}px)) scale(1.1)`,
        opacity: 0,
      },
    ],
    {
      duration: rand(1400, 1800),
      fontSize: vmin(0.22),
      easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    }
  );

  for (let i = 0; i < 5; i++) {
    const offset = (i - 2) * vw(0.07);
    const markRise = rand(vh(0.35), vh(0.65));
    const markDrift = offset + rand(-vw(0.03), vw(0.03));
    spawnEmoji(
      "❗",
      x + offset,
      y,
      [
        { transform: "translate(-50%, -50%) scale(0.3)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1.3)", opacity: 1, offset: 0.15 },
        {
          transform: `translate(calc(-50% + ${markDrift}px), calc(-50% - ${markRise}px)) scale(1)`,
          opacity: 0,
        },
      ],
      {
        duration: rand(1200, 1600),
        delay: 80 + i * 45,
        fontSize: vmin(0.08),
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
  }
}

function goalEffect(origin: ReactionEffectOrigin) {
  const { x, y } = toPx(origin);
  const balls = 3;

  for (let b = 0; b < balls; b++) {
    const el = document.createElement("span");
    el.textContent = "⚽";
    el.setAttribute("aria-hidden", "true");
    const startX = x + rand(-vw(0.08), vw(0.08));
    const startY = y + rand(-vh(0.03), vh(0.03));
    el.style.cssText = [
      "position:absolute",
      `left:${startX}px`,
      `top:${startY}px`,
      `font-size:${vmin(0.1)}px`,
      "line-height:1",
      "transform:translate(-50%,-50%)",
      "will-change:transform",
    ].join(";");
    getOverlay().appendChild(el);

    const direction = b === 0 ? (Math.random() > 0.5 ? 1 : -1) : b === 1 ? -1 : 1;
    let posX = startX;
    let posY = startY;
    let velX = direction * rand(vw(0.018), vw(0.032));
    let velY = -rand(vh(0.025), vh(0.04));
    const gravity = vh(0.00055);
    let rotation = 0;
    let frame = 0;

    const sessionAtStart = effectSessionId;

    const tick = () => {
      if (sessionAtStart !== effectSessionId) {
        el.remove();
        return;
      }

      frame += 1;
      velY += gravity;
      posX += velX;
      posY += velY;
      rotation += velX * 3;

      el.style.left = `${posX}px`;
      el.style.top = `${posY}px`;
      el.style.transform = `translate(-50%, -50%) rotate(${rotation}deg)`;

      if (frame > 180 || posY > activeBounds.height + 20) {
        el.remove();
        return;
      }
      trackRaf(requestAnimationFrame(tick));
    };

    trackTimeout(setTimeout(() => trackRaf(requestAnimationFrame(tick)), b * 120));
  }

  spawnRing(
    x,
    y,
    [
      { transform: "translate(-50%, -50%) scale(0.4)", opacity: 0.75 },
      { transform: `translate(-50%, -50%) scale(${screenFillScale(origin) * 0.5})`, opacity: 0 },
    ],
    { border: "4px solid rgba(34,197,94,0.75)", duration: 700, size: 36 }
  );
}

function heartEffect(origin: ReactionEffectOrigin) {
  const { x, y } = toPx(origin);
  const hearts = 22;

  for (let i = 0; i < hearts; i++) {
    const drift = rand(-vw(0.4), vw(0.4));
    const rise = rand(vh(0.3), vh(0.75));
    spawnEmoji(
      "❤️",
      x + rand(-vw(0.2), vw(0.2)),
      y,
      [
        { transform: "translate(-50%, -50%) scale(0.3)", opacity: 0 },
        { transform: "translate(-50%, -50%) scale(1.1)", opacity: 1, offset: 0.12 },
        {
          transform: `translate(calc(-50% + ${drift}px), calc(-50% - ${rise}px)) scale(${rand(0.85, 1.25)})`,
          opacity: 0,
        },
      ],
      {
        duration: rand(1300, 1900),
        delay: i * 60,
        fontSize: rand(vmin(0.05), vmin(0.12)),
        easing: "cubic-bezier(0.22, 1, 0.36, 1)",
      }
    );
  }
}

function fireworksEffect(origin: ReactionEffectOrigin) {
  const base = toPx(origin ?? DEFAULT_ORIGIN);
  const canvas = document.createElement("canvas");
  canvas.width = activeBounds.width;
  canvas.height = activeBounds.height;
  canvas.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  canvas.setAttribute("aria-hidden", "true");
  getOverlay().appendChild(canvas);

  const ctx = canvas.getContext("2d");
  if (!ctx) {
    canvas.remove();
    return;
  }

  type Spark = {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
  };

  const bursts: { sparks: Spark[]; delay: number }[] = [];
  const palette = ["#ef4444", "#eab308", "#22c55e", "#3b82f6", "#a855f7", "#ec4899"];

  for (let b = 0; b < 7; b++) {
    const cx = base.x + rand(-vw(0.06), vw(0.06));
    const cy = base.y + rand(-vh(0.06), vh(0.06));
    const color = palette[b % palette.length];
    const sparks: Spark[] = [];

    for (let i = 0; i < 40; i++) {
      const angle = (Math.PI * 2 * i) / 40 + rand(-0.08, 0.08);
      const speed = rand(4, 11);
      sparks.push({
        x: cx,
        y: cy,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1,
        color,
        size: rand(2, 4.5),
      });
    }

    bursts.push({ sparks, delay: b * 140 });
  }

  const start = performance.now();
  const duration = 2200;
  const sessionAtStart = effectSessionId;

  const frame = (now: number) => {
    if (sessionAtStart !== effectSessionId) {
      canvas.remove();
      return;
    }

    const elapsed = now - start;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const burst of bursts) {
      if (elapsed < burst.delay) continue;

      for (const spark of burst.sparks) {
        spark.x += spark.vx;
        spark.y += spark.vy;
        spark.vy += 0.035;
        spark.life -= 0.012;

        if (spark.life <= 0) continue;

        ctx.globalAlpha = spark.life;
        ctx.fillStyle = spark.color;
        ctx.beginPath();
        ctx.arc(spark.x, spark.y, spark.size, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = spark.color;
        ctx.lineWidth = 1.5;
        ctx.globalAlpha = spark.life * 0.55;
        ctx.beginPath();
        ctx.moveTo(spark.x, spark.y);
        ctx.lineTo(spark.x - spark.vx * 4, spark.y - spark.vy * 4);
        ctx.stroke();
      }
    }

    ctx.globalAlpha = 1;

    if (elapsed < duration) {
      trackRaf(requestAnimationFrame(frame));
    } else {
      canvas.remove();
    }
  };

  trackRaf(requestAnimationFrame(frame));
}

function confettiEffect(origin: ReactionEffectOrigin) {
  if (prefersReducedMotion()) return;

  const o = origin ?? DEFAULT_ORIGIN;
  const fire = getConfettiFn();
  const base = {
    origin: o,
    disableForReducedMotion: true,
  };

  fire({
    ...base,
    particleCount: 120,
    spread: 100,
    startVelocity: 48,
  });

  fire({
    ...base,
    particleCount: 80,
    spread: 120,
    startVelocity: 42,
    scalar: 1.05,
    ticks: 150,
  });

  fire({
    ...base,
    particleCount: 50,
    spread: 70,
    startVelocity: 55,
    angle: 60,
    origin: { x: Math.max(0.1, o.x - 0.08), y: o.y },
  });

  fire({
    ...base,
    particleCount: 50,
    spread: 70,
    startVelocity: 55,
    angle: 120,
    origin: { x: Math.min(0.9, o.x + 0.08), y: o.y },
  });
}

const EFFECTS: Record<ReactionType, (origin: ReactionEffectOrigin) => void> = {
  clap: clapEffect,
  fire: fireEffect,
  wow: wowEffect,
  goal: goalEffect,
  heart: heartEffect,
  fireworks: fireworksEffect,
  confetti: confettiEffect,
};

export function fireReactionEffect(
  type: ReactionType,
  origin?: ReactionEffectOrigin,
  options?: ReactionEffectOptions
) {
  if (prefersReducedMotion()) return;
  if (!isSessionActive(options?.sessionId)) return;
  setActiveEffectScope(options);
  EFFECTS[type](resolveEffectOrigin(origin, options));
}

export function fireReactionEffectsFromCounts(
  counts: Record<ReactionType, number>,
  origin?: ReactionEffectOrigin,
  options?: ReactionEffectOptions
) {
  if (prefersReducedMotion()) return;
  if (!isSessionActive(options?.sessionId)) return;

  const types = REACTION_TYPES.filter((type) => (counts[type] ?? 0) > 0);
  if (types.length === 0) return;

  setActiveEffectScope(options);
  const sessionId = options?.sessionId ?? effectSessionId;
  types.forEach((type, index) => {
    trackTimeout(
      setTimeout(() => {
        fireReactionEffect(type, origin, { ...options, sessionId });
      }, index * 200)
    );
  });
}
