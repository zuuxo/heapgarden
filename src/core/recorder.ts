import { appendFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { MemorySample } from "./types.js";

export class Recorder {
  constructor(private readonly path: string) {}

  async write(sample: MemorySample): Promise<void> {
    await mkdir(dirname(this.path), { recursive: true });
    await appendFile(this.path, JSON.stringify(sample) + "\n", "utf8");
  }
}
