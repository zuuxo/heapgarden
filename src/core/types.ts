export interface MemorySample {
  sequence: number;
  timestamp: number;
  at: string;
  uptimeMs: number;
  heapUsed: number;
  heapTotal: number;
  rss: number;
  external: number;
  arrayBuffers: number;
  heapLimit: number;
  totalAvailableSize: number;
  mallocedMemory: number;
  eventLoopUtilization: number;
  gcCount: number;
  gcDurationMs: number;
}

export type LeakLevel = "warming" | "stable" | "watch" | "likely-leak";

export interface TrendAnalysis {
  level: LeakLevel;
  slopeBytesPerMinute: number;
  slopePercentPerMinute: number;
  r2: number;
  windowMs: number;
  sampleCount: number;
  message: string;
}

export interface SessionState {
  pid: number | null;
  entry: string;
  startedAt: string;
  childState: "starting" | "running" | "exited" | "error";
  exitCode: number | null;
  signal: string | null;
  samples: MemorySample[];
  trend: TrendAnalysis;
}
