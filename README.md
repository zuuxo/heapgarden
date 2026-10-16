# heapgarden

A local Node.js memory visualizer written in TypeScript.

Heapgarden launches a Node process with a tiny preload probe and turns its memory behavior into a live browser dashboard.

Instead of staring at raw numbers, the dashboard treats memory areas like a garden:

- taller plants = more memory in use
- healthy / watch / likely-leak status = trend detector
- timeline = heap and RSS history
- recent GC panel = garbage-collection activity

## What it measures

Heapgarden samples:

- `heapUsed`
- `heapTotal`
- RSS
- external memory
- ArrayBuffer memory
- V8 heap limit
- V8 available heap size
- malloced memory
- event-loop utilization
- GC count
- GC duration

The probe runs inside the target Node process and sends telemetry to the Heapgarden parent over Node IPC.

No remote collector or cloud account is required.

## Leak signal

Heapgarden performs a rolling linear-regression analysis over recent `heapUsed` samples.

It calculates:

- growth slope in bytes/minute
- relative growth in percent/minute
- R² consistency score
- observation window

The result is classified as:

```text
WARMING
STABLE
WATCH
LIKELY LEAK
```

This is a heuristic signal, not a replacement for V8 heap snapshots or production profiling. It is meant to answer a fast question: **is this process showing sustained heap growth worth investigating?**

## Quick start

```bash
npm install
npm run build
```

Run the deliberately leaky demo:

```bash
node dist/cli.js run examples/leaky-app.js
```

Open:

```text
http://127.0.0.1:7417
```

Compare it with the stable demo:

```bash
node dist/cli.js run examples/stable-app.js
```

## Install as a CLI

```bash
npm link
heapgarden run app.js
```

## Record a session

```bash
heapgarden run app.js --record sessions/app.jsonl
```

Each line is one raw telemetry sample. The file can later be processed with jq, Python, DuckDB or another analysis tool.

## Sampling interval

Default:

```text
1000 ms
```

Change it:

```bash
heapgarden run app.js --interval 500
```

The minimum interval is 250 ms.

## Pass application arguments

Everything after `--` is passed to the target application:

```bash
heapgarden run server.js -- --port 3000 --mode development
```

## Pass Node flags

Use `--node-arg`:

```bash
heapgarden run app.js --node-arg=--expose-gc
```

Repeat it for multiple flags.

## Architecture

```text
┌──────────────────────────────┐
│ target Node.js process       │
│                              │
│ app.js                       │
│ + Heapgarden preload probe   │
└─────────────┬────────────────┘
              │ Node IPC
              │ memory samples
              ▼
┌──────────────────────────────┐
│ Heapgarden parent            │
│                              │
│ trend analysis               │
│ JSONL recorder               │
│ local HTTP/SSE server        │
└─────────────┬────────────────┘
              │
              ▼
┌──────────────────────────────┐
│ browser dashboard            │
│                              │
│ memory garden                │
│ heap/RSS timeline            │
│ leak signal                  │
│ recent GC                    │
└──────────────────────────────┘
```

## Why a preload probe?

The target process can report its own memory accurately via `process.memoryUsage()` and `v8.getHeapStatistics()`.

The parent process does not need to scrape OS output or attach a heavyweight external profiler just to collect lightweight telemetry.

## Local-first

Heapgarden does not send telemetry anywhere.

The dashboard binds to `127.0.0.1` by default. Session recording is disabled unless `--record` is supplied.

## Project structure

```text
heapgarden/
├── src/
│   ├── core/
│   │   ├── recorder.ts
│   │   ├── trend.ts
│   │   └── types.ts
│   ├── dashboard/
│   │   ├── assets.ts
│   │   └── html.ts
│   ├── cli.ts
│   ├── probe.ts
│   └── server.ts
├── examples/
│   ├── leaky-app.js
│   └── stable-app.js
├── tests/
│   └── trend.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Requirements

- Node.js 20+
- npm

## Limitations

Heapgarden intentionally starts as a lightweight process-level memory monitor. It does not yet attribute retained memory to individual objects or modules. That requires V8 heap snapshots or the Inspector protocol and would be a natural future direction.

## License

MIT
