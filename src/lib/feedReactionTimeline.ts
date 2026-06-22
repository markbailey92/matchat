export interface TimelinePoint {
  x: number;
  y: number;
}

const CHART_PADDING_X = 0;

export function buildPerEventEngagement(
  eventIds: string[],
  engagementByEventId: Record<string, number>
): number[] {
  return eventIds.map((id) => engagementByEventId[id] ?? 0);
}

export function buildHeatmapPoints(
  perEventValues: number[],
  width: number,
  chartHeight: number
): TimelinePoint[] {
  if (perEventValues.length === 0) return [];

  const displayValues = smoothEngagementValues(perEventValues);
  const innerWidth = Math.max(width - CHART_PADDING_X * 2, 1);
  const baselineY = chartHeight - 1;
  const eventCount = displayValues.length;

  return displayValues.map((value, index) => {
    const x =
      displayValues.length === 1
        ? CHART_PADDING_X + innerWidth / 2
        : CHART_PADDING_X + (index / (displayValues.length - 1)) * innerWidth;

    const normalized = normalizeEngagementForChart(
      value,
      displayValues,
      eventCount
    );
    const amplitude = normalized * (chartHeight - 2);

    return { x, y: baselineY - amplitude };
  });
}

/** Linear blend between heatmap points for a fractional event index. */
export function interpolatePointAtProgress(
  points: TimelinePoint[],
  progress: number
): TimelinePoint | null {
  if (points.length === 0) return null;
  if (points.length === 1) return points[0];
  if (points.length === 2) {
    const clamped = Math.max(0, Math.min(progress, 1));
    return {
      x: points[0].x + (points[1].x - points[0].x) * clamped,
      y: points[0].y + (points[1].y - points[0].y) * clamped,
    };
  }

  const clamped = Math.max(0, Math.min(progress, points.length - 1));
  const fromIndex = Math.floor(clamped);
  const toIndex = Math.min(fromIndex + 1, points.length - 1);
  const fraction = clamped - fromIndex;

  if (fraction <= 0) return points[fromIndex];

  const p0 = points[Math.max(fromIndex - 1, 0)];
  const p1 = points[fromIndex];
  const p2 = points[toIndex];
  const p3 = points[Math.min(toIndex + 1, points.length - 1)];

  return evaluateCatmullRomSegment(p0, p1, p2, p3, fraction);
}

export function indexFromChartX(
  x: number,
  count: number,
  width: number
): number {
  return Math.round(progressFromChartX(x, count, width));
}

/** Fractional event index (0 … count − 1) for continuous timeline scrubbing. */
export function progressFromChartX(
  x: number,
  count: number,
  width: number
): number {
  if (count <= 1) return 0;
  const innerWidth = Math.max(width - CHART_PADDING_X * 2, 1);
  const ratio = Math.max(0, Math.min(1, (x - CHART_PADDING_X) / innerWidth));
  return ratio * (count - 1);
}

const SMOOTHNESS = 8;
const ENGAGEMENT_GAUSSIAN_SIGMA_MAX = 5.5;
const ENGAGEMENT_GAUSSIAN_SIGMA_MIN = 0.45;

function formatPathCoord(value: number): string {
  return (Math.round(value * 10) / 10).toFixed(1);
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = (sorted.length - 1) * p;
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) return sorted[lower];
  const weight = index - lower;
  return sorted[lower] * (1 - weight) + sorted[upper] * weight;
}

/** Avoid a single hot event flattening the rest of the timeline. */
function computeDisplayScale(values: number[]): number {
  const max = Math.max(...values, 0);
  if (max <= 0) return 0;

  const ranked = [...values].filter((value) => value > 0).sort((a, b) => b - a);
  if (ranked.length <= 1) return max;

  const second = ranked[1] ?? 0;
  const p90 = percentile(values, 0.9);

  if (max > second * 2) {
    return Math.max(second * 1.3, p90, max * 0.55);
  }

  return max;
}

function normalizeEngagementForChart(
  value: number,
  values: number[],
  eventCount: number
): number {
  const scale = computeDisplayScale(values);
  if (scale <= 0 || value <= 0) return 0;

  const linear = Math.min(1, value / scale);
  const expanded = Math.sqrt(linear);
  return emphasizeEngagementContrast(expanded, eventCount);
}

/** Wider smoothing for long timelines; tight peaks when only a few events exist. */
function adaptiveGaussianSigma(eventCount: number, values: number[]): number {
  if (eventCount <= 2) return 0;
  const scaled = 0.35 + eventCount * 0.048;
  let sigma = Math.min(
    ENGAGEMENT_GAUSSIAN_SIGMA_MAX,
    Math.max(ENGAGEMENT_GAUSSIAN_SIGMA_MIN, scaled)
  );

  const ranked = [...values].filter((value) => value > 0).sort((a, b) => b - a);
  const max = ranked[0] ?? 0;
  const second = ranked[1] ?? 0;
  if (second > 0 && max > second * 2.5) {
    sigma *= 0.5;
  }

  return sigma;
}

/** Extra peak/trough separation on sparse early-game timelines. */
function emphasizeEngagementContrast(
  normalized: number,
  eventCount: number
): number {
  if (normalized <= 0 || normalized >= 1) return normalized;
  if (eventCount >= 40) return normalized;
  const gamma = Math.min(0.88, 0.5 + eventCount * 0.015);
  return Math.pow(normalized, gamma);
}

function gaussianBlur(values: number[], sigma: number): number[] {
  if (sigma <= 0) return values;

  const radius = Math.ceil(sigma * 2.5);

  return values.map((_, index) => {
    let sum = 0;
    let weight = 0;

    for (let offset = -radius; offset <= radius; offset += 1) {
      const sampleIndex = index + offset;
      if (sampleIndex < 0 || sampleIndex >= values.length) continue;
      const kernelWeight = Math.exp(
        -(offset * offset) / (2 * sigma * sigma)
      );
      sum += values[sampleIndex] * kernelWeight;
      weight += kernelWeight;
    }

    return weight > 0 ? sum / weight : 0;
  });
}

function smoothEngagementValues(values: number[]): number[] {
  if (values.length <= 2) return values;

  const sigma = adaptiveGaussianSigma(values.length, values);
  if (sigma <= 0) return values;

  const once = gaussianBlur(values, sigma);
  const ranked = [...once].filter((value) => value > 0).sort((a, b) => b - a);
  const max = ranked[0] ?? 0;
  const second = ranked[1] ?? 0;
  const dominantSpike = second > 0 && max > second * 2.5;

  if (values.length >= 24 && !dominantSpike) {
    return gaussianBlur(once, sigma);
  }

  return once;
}

function evaluateCatmullRomSegment(
  p0: TimelinePoint,
  p1: TimelinePoint,
  p2: TimelinePoint,
  p3: TimelinePoint,
  t: number
): TimelinePoint {
  const cp1x = p1.x + (p2.x - p0.x) / SMOOTHNESS;
  const cp1y = p1.y + (p2.y - p0.y) / SMOOTHNESS;
  const cp2x = p2.x - (p3.x - p1.x) / SMOOTHNESS;
  const cp2y = p2.y - (p3.y - p1.y) / SMOOTHNESS;

  const u = 1 - t;
  const uu = u * u;
  const uuu = uu * u;
  const tt = t * t;
  const ttt = tt * t;

  return {
    x:
      uuu * p1.x +
      3 * uu * t * cp1x +
      3 * u * tt * cp2x +
      ttt * p2.x,
    y:
      uuu * p1.y +
      3 * uu * t * cp1y +
      3 * u * tt * cp2y +
      ttt * p2.y,
  };
}

/** Smooth SVG path through points using Catmull-Rom cubic beziers. */
export function buildSmoothLinePath(points: TimelinePoint[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) {
    return `M ${formatPathCoord(points[0].x)} ${formatPathCoord(points[0].y)}`;
  }
  if (points.length === 2) {
    return `M ${formatPathCoord(points[0].x)} ${formatPathCoord(points[0].y)} L ${formatPathCoord(points[1].x)} ${formatPathCoord(points[1].y)}`;
  }

  let path = `M ${formatPathCoord(points[0].x)} ${formatPathCoord(points[0].y)}`;

  for (let i = 0; i < points.length - 1; i += 1) {
    const p0 = points[Math.max(i - 1, 0)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(i + 2, points.length - 1)];

    const cp1x = p1.x + (p2.x - p0.x) / SMOOTHNESS;
    const cp1y = p1.y + (p2.y - p0.y) / SMOOTHNESS;
    const cp2x = p2.x - (p3.x - p1.x) / SMOOTHNESS;
    const cp2y = p2.y - (p3.y - p1.y) / SMOOTHNESS;

    path += ` C ${formatPathCoord(cp1x)} ${formatPathCoord(cp1y)}, ${formatPathCoord(cp2x)} ${formatPathCoord(cp2y)}, ${formatPathCoord(p2.x)} ${formatPathCoord(p2.y)}`;
  }

  return path;
}

/** Closed area under the smooth curve down to the baseline. */
export function buildSmoothAreaPath(
  points: TimelinePoint[],
  baselineY: number
): string {
  if (points.length === 0) return "";
  const line = buildSmoothLinePath(points);
  const first = points[0];
  const last = points[points.length - 1];
  return `${line} L ${last.x} ${baselineY} L ${first.x} ${baselineY} Z`;
}
