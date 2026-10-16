import { SCRIPT, STYLE } from "./assets.js";

export function dashboardHtml(entry: string): string {
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="Heapgarden local Node.js memory visualizer"><title>Heapgarden</title><style>${STYLE}</style></head>
<body><main class="app">
<header><div><span class="eyebrow">NODE MEMORY GARDEN</span><h1>heapgarden</h1><p>${escapeHtml(entry)}</p></div><div class="badge"><i class="dot" id="state-dot"></i><span id="child-state">starting</span><span>· PID <b id="pid">—</b></span></div></header>
<section class="stats"><div class="stat"><span>Heap used</span><strong id="heap-used">—</strong></div><div class="stat"><span>RSS</span><strong id="rss">—</strong></div><div class="stat"><span>Event loop</span><strong id="elu">—</strong></div><div class="stat"><span>Recent GC</span><strong id="gc">—</strong></div><div class="stat"><span>Samples</span><strong id="sample-count">0</strong></div></section>
<section class="layout"><div><section class="card"><div class="card-head"><span class="eyebrow">MEMORY GARDEN</span><span class="eyebrow">LIVE</span></div><div class="garden">${bed("heapUsed","Heap used")}${bed("rss","RSS")}${bed("external","External")}${bed("arrayBuffers","Array buffers")}</div></section>
<section class="card" style="margin-top:12px"><div class="card-head"><span class="eyebrow">TIMELINE</span><span class="eyebrow">HEAP + RSS</span></div><div class="chart-wrap"><canvas id="chart"></canvas></div></section></div>
<aside><section class="card"><div class="card-head"><span class="eyebrow">LEAK SIGNAL</span></div><div class="trend"><span class="trend-state warming" id="trend-state">WARMING</span><h2 id="trend-title">Growing baseline.</h2><p id="trend-message">Collecting enough memory samples to estimate a stable trend.</p><div class="metrics"><div class="metric"><span>Slope</span><strong id="slope">—</strong></div><div class="metric"><span>Relative slope</span><strong id="slope-percent">—</strong></div><div class="metric"><span>Trend R²</span><strong id="r2">—</strong></div><div class="metric"><span>Window</span><strong id="window">—</strong></div></div></div></section>
<section class="card" style="margin-top:12px"><div class="card-head"><span class="eyebrow">RECENT GC</span></div><div class="gc-list" id="gc-list"><div class="empty">Waiting for GC activity...</div></div></section></aside></section>
<footer><span>heap · rss · v8 · event loop · gc · trend detection</span><span>local-first</span></footer>
</main><script>${SCRIPT}</script></body></html>`;
}

function bed(key: string, label: string): string {
  return `<div class="bed"><div class="bed-label"><span>${label}</span><strong data-value="${key}">—</strong></div><div class="plant" data-plant="${key}"><i class="stem"></i><i class="leaf a"></i><i class="leaf b"></i><i class="flower"></i></div><div class="soil"></div></div>`;
}

function escapeHtml(value: string): string {
  return value.replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
}
