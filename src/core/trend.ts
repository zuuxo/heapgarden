import type { LeakLevel, MemorySample, TrendAnalysis } from "./types.js";

const MIN_SAMPLES = 8;
const MAX_WINDOW = 90;

export function analyzeHeapTrend(samples: MemorySample[]): TrendAnalysis {
  const window = samples.slice(-MAX_WINDOW);

  if (window.length < MIN_SAMPLES) {
    return {
      level: "warming",
      slopeBytesPerMinute: 0,
      slopePercentPerMinute: 0,
      r2: 0,
      windowMs: window.length > 1 ? window.at(-1)!.timestamp - window[0].timestamp : 0,
      sampleCount: window.length,
      message: `Collecting baseline (${window.length}/${MIN_SAMPLES} samples).`
    };
  }

  const firstTime = window[0].timestamp;
  const xs = window.map((sample) => (sample.timestamp - firstTime) / 60_000);
  const ys = window.map((sample) => sample.heapUsed);
  const { slope, r2 } = linearRegression(xs, ys);

  const baseline = median(
    window.slice(0, Math.max(3, Math.floor(window.length / 4))).map((sample) => sample.heapUsed)
  );
  const slopePercentPerMinute = baseline > 0 ? (slope / baseline) * 100 : 0;
  const level = classifyTrend(slope, slopePercentPerMinute, r2, window.length);

  return {
    level,
    slopeBytesPerMinute: slope,
    slopePercentPerMinute,
    r2,
    windowMs: window.at(-1)!.timestamp - window[0].timestamp,
    sampleCount: window.length,
    message: trendMessage(level, slope, slopePercentPerMinute)
  };
}

function classifyTrend(slope: number, slopePercentPerMinute: number, r2: number, sampleCount: number): LeakLevel {
  if (sampleCount < MIN_SAMPLES) return "warming";

  const absoluteGrowth = slope >= 512 * 1024;
  const relativeGrowth = slopePercentPerMinute >= 1.0;

  if (r2 >= 0.72 && (absoluteGrowth || relativeGrowth) && slope > 0) return "likely-leak";
  if (r2 >= 0.48 && slope > 256 * 1024 && slopePercentPerMinute > 0.35) return "watch";
  return "stable";
}

function trendMessage(level: LeakLevel, slope: number, slopePercentPerMinute: number): string {
  const rate = formatBytes(Math.abs(slope));

  if (level === "likely-leak") {
    return `Heap is growing about ${rate}/min (${slopePercentPerMinute.toFixed(1)}%/min), with a consistent upward trend.`;
  }
  if (level === "watch") {
    return `Heap is trending upward about ${rate}/min, but the signal is not strong enough yet.`;
  }
  if (level === "stable") {
    return slope < 0
      ? `Heap is stable; current trend is ${rate}/min downward.`
      : `Heap is stable; growth is about ${rate}/min with low leak confidence.`;
  }
  return "Collecting baseline.";
}

function linearRegression(xs: number[], ys: number[]): { slope: number; r2: number } {
  const n = xs.length;
  const meanX = xs.reduce((sum, value) => sum + value, 0) / n;
  const meanY = ys.reduce((sum, value) => sum + value, 0) / n;
  let numerator = 0;
  let denominator = 0;

  for (let i = 0; i < n; i++) {
    const dx = xs[i] - meanX;
    numerator += dx * (ys[i] - meanY);
    denominator += dx * dx;
  }

  const slope = denominator === 0 ? 0 : numerator / denominator;
  const intercept = meanY - slope * meanX;
  let total = 0;
  let residual = 0;

  for (let i = 0; i < n; i++) {
    const prediction = intercept + slope * xs[i];
    total += (ys[i] - meanY) ** 2;
    residual += (ys[i] - prediction) ** 2;
  }

  return { slope, r2: total === 0 ? 1 : Math.max(0, 1 - residual / total) };
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes.toFixed(0)} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
