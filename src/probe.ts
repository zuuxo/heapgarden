import v8 from "node:v8";
import { PerformanceObserver, performance } from "node:perf_hooks";
import type { MemorySample } from "./core/types.js";

const interval = parseInterval(process.env.HEAPGARDEN_INTERVAL_MS);
let sequence = 0;
let gcCount = 0;
let gcDurationMs = 0;

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    gcCount++;
    gcDurationMs += entry.duration;
  }
});

try {
  observer.observe({ entryTypes: ["gc"] });
} catch {
  // Optional telemetry: old/limited runtimes may not expose GC entries.
}

let previousElu = performance.eventLoopUtilization();

const timer = setInterval(() => {
  const memory = process.memoryUsage();
  const heap = v8.getHeapStatistics();
  const elu = performance.eventLoopUtilization(previousElu);
  previousElu = performance.eventLoopUtilization();

  const sample: MemorySample = {
    sequence: ++sequence,
    timestamp: Date.now(),
    at: new Date().toISOString(),
    uptimeMs: Math.round(process.uptime() * 1000),
    heapUsed: memory.heapUsed,
    heapTotal: memory.heapTotal,
    rss: memory.rss,
    external: memory.external,
    arrayBuffers: memory.arrayBuffers,
    heapLimit: heap.heap_size_limit,
    totalAvailableSize: heap.total_available_size,
    mallocedMemory: heap.malloced_memory,
    eventLoopUtilization: elu.utilization,
    gcCount,
    gcDurationMs
  };

  process.send?.({ type: "heapgarden:sample", sample });
  gcCount = 0;
  gcDurationMs = 0;
}, interval);

process.send?.({ type: "heapgarden:ready", pid: process.pid });

function parseInterval(raw: string | undefined): number {
  const value = Number(raw ?? 1000);
  return Number.isFinite(value) ? Math.max(250, Math.floor(value)) : 1000;
}
