#!/usr/bin/env node
import { spawn, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { analyzeHeapTrend } from "./core/trend.js";
import { Recorder } from "./core/recorder.js";
import type { MemorySample, SessionState } from "./core/types.js";
import { createDashboardServer } from "./server.js";

const args = process.argv.slice(2);

try {
  if (args.length === 0 || args.includes("--help") || args.includes("-h")) {
    printHelp();
    process.exit(0);
  }

  if (args[0] !== "run" || !args[1]) {
    throw new Error("expected 'run <entry>'");
  }

  const entry = resolve(args[1]);
  const options = parseOptions(args.slice(2));

  if (!existsSync(entry)) {
    throw new Error(`entry not found: ${entry}`);
  }

  const probePath = fileURLToPath(new URL("./probe.js", import.meta.url));

  const state: SessionState = {
    pid: null,
    entry,
    startedAt: new Date().toISOString(),
    childState: "starting",
    exitCode: null,
    signal: null,
    samples: [],
    trend: analyzeHeapTrend([])
  };

  const recorder = options.record ? new Recorder(resolve(options.record)) : null;
  const dashboard = createDashboardServer(() => cloneState(state), entry, options.host, options.port);

  dashboard.server.listen(options.port, options.host, () => {
    console.log("heapgarden\n");
    console.log(`entry:      ${entry}`);
    console.log(`dashboard:  http://${options.host}:${options.port}`);
    console.log(`interval:   ${options.interval} ms`);
    console.log(`recording:  ${options.record ? resolve(options.record) : "off"}`);
    console.log("\nPress Ctrl+C to stop.");
  });

  const child = spawn(
    process.execPath,
    ["--import", probePath, ...options.nodeArgs, entry, ...options.appArgs],
    {
      stdio: ["inherit", "inherit", "inherit", "ipc"],
      env: { ...process.env, HEAPGARDEN_INTERVAL_MS: String(options.interval) }
    }
  );

  state.pid = child.pid ?? null;

  child.on("message", (message: unknown) => {
    if (!isMessage(message)) return;

    if (message.type === "heapgarden:ready") {
      state.childState = "running";
      state.pid = message.pid;
      dashboard.broadcast(cloneState(state));
      return;
    }

    state.samples.push(message.sample);
    if (state.samples.length > options.maxSamples) {
      state.samples.splice(0, state.samples.length - options.maxSamples);
    }
    state.trend = analyzeHeapTrend(state.samples);
    if (recorder) void recorder.write(message.sample);
    dashboard.broadcast(cloneState(state));
  });

  child.on("error", (error) => {
    state.childState = "error";
    console.error(`heapgarden child error: ${error.message}`);
    dashboard.broadcast(cloneState(state));
  });

  child.on("exit", (code, signal) => {
    state.childState = "exited";
    state.exitCode = code;
    state.signal = signal;
    dashboard.broadcast(cloneState(state));
    console.log(`\ntarget exited: code=${code ?? "null"} signal=${signal ?? "none"}`);
  });

  const shutdown = async () => {
    stopChild(child);
    await dashboard.close();
    process.exit(0);
  };

  process.once("SIGINT", () => void shutdown());
  process.once("SIGTERM", () => void shutdown());
} catch (error) {
  console.error(`heapgarden: ${error instanceof Error ? error.message : "unknown error"}`);
  process.exitCode = 1;
}

interface Options {
  host: string;
  port: number;
  interval: number;
  maxSamples: number;
  record?: string;
  nodeArgs: string[];
  appArgs: string[];
}

function parseOptions(values: string[]): Options {
  const options: Options = {
    host: "127.0.0.1",
    port: 7417,
    interval: 1000,
    maxSamples: 600,
    nodeArgs: [],
    appArgs: []
  };

  let appMode = false;

  for (let i = 0; i < values.length; i++) {
    const raw = values[i];
    if (raw === "--") { appMode = true; continue; }
    if (appMode) { options.appArgs.push(raw); continue; }

    const equals = raw.indexOf("=");
    const option = equals > 0 ? raw.slice(0, equals) : raw;
    const inlineValue = equals > 0 ? raw.slice(equals + 1) : null;
    const nextValue = () => inlineValue ?? requiredValue(values, ++i, option);

    if (option === "--host") options.host = nextValue();
    else if (option === "--port") options.port = parsePositiveInteger(nextValue(), option);
    else if (option === "--interval") options.interval = Math.max(250, parsePositiveInteger(nextValue(), option));
    else if (option === "--max-samples") options.maxSamples = parsePositiveInteger(nextValue(), option);
    else if (option === "--record") options.record = nextValue();
    else if (option === "--node-arg") options.nodeArgs.push(nextValue());
    else throw new Error(`unknown option: ${raw}`);
  }

  return options;
}

function requiredValue(values: string[], index: number, option: string): string {
  const value = values[index];
  if (!value) throw new Error(`missing value for ${option}`);
  return value;
}

function parsePositiveInteger(raw: string, option: string): number {
  const value = Number.parseInt(raw, 10);
  if (!Number.isInteger(value) || value <= 0) throw new Error(`${option} must be a positive integer`);
  return value;
}

function isMessage(value: unknown): value is (
  { type: "heapgarden:ready"; pid: number } |
  { type: "heapgarden:sample"; sample: MemorySample }
) {
  if (typeof value !== "object" || value === null) return false;
  const message = value as Record<string, unknown>;
  if (message.type === "heapgarden:ready" && typeof message.pid === "number") return true;
  return message.type === "heapgarden:sample" && typeof message.sample === "object" && message.sample !== null;
}

function cloneState(value: SessionState): SessionState {
  return { ...value, samples: [...value.samples], trend: { ...value.trend } };
}

function stopChild(child: ChildProcess): void {
  if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
}

function printHelp(): void {
  console.log(`heapgarden

Usage:
  heapgarden run <entry> [options] [-- app args]

Options:
  --host <host>          Dashboard host (default 127.0.0.1)
  --port <port>          Dashboard port (default 7417)
  --interval <ms>        Sample interval, minimum 250 ms
  --max-samples <count>  Samples retained in memory (default 600)
  --record <file>        Save samples to JSONL
  --node-arg <value>     Pass one Node argument before the entry file
  -h, --help             Show this help

Examples:
  heapgarden run examples/leaky-app.js
  heapgarden run app.js --record sessions/app.jsonl
  heapgarden run app.js --node-arg=--expose-gc
  heapgarden run server.js -- --port 3000`);
}
