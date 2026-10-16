import test from "node:test";
import assert from "node:assert/strict";
import { analyzeHeapTrend } from "../dist/core/trend.js";

function sample(index, heapUsed) {
  return { sequence:index+1,timestamp:1_000_000+index*10_000,at:new Date(1_000_000+index*10_000).toISOString(),uptimeMs:index*10_000,heapUsed,heapTotal:heapUsed*1.3,rss:heapUsed*1.8,external:0,arrayBuffers:0,heapLimit:4_000_000_000,totalAvailableSize:3_000_000_000,mallocedMemory:0,eventLoopUtilization:.1,gcCount:0,gcDurationMs:0 };
}

test("reports warming with too few samples", () => {
  assert.equal(analyzeHeapTrend([sample(0,20_000_000),sample(1,21_000_000)]).level,"warming");
});

test("detects a strong consistent growth trend", () => {
  const samples=Array.from({length:20},(_,index)=>sample(index,20_000_000+index*1_200_000));
  const result=analyzeHeapTrend(samples);
  assert.equal(result.level,"likely-leak");
  assert.ok(result.r2>.99);
  assert.ok(result.slopeBytesPerMinute>0);
});

test("keeps oscillating heap in stable state", () => {
  const samples=Array.from({length:24},(_,index)=>sample(index,40_000_000+Math.sin(index*1.4)*1_500_000));
  assert.equal(analyzeHeapTrend(samples).level,"stable");
});
