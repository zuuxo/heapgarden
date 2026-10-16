declare const process: any;
declare const Buffer: any;

declare module "node:child_process" {
  export interface ChildProcess {
    pid?: number;
    exitCode: number | null;
    killed: boolean;
    kill(signal?: string): boolean;
    on(event: string, listener: (...args: any[]) => void): this;
  }
  export function spawn(command: string, args?: string[], options?: any): ChildProcess;
}

declare module "node:fs" {
  export function existsSync(path: string): boolean;
}

declare module "node:fs/promises" {
  export function appendFile(path: string, data: string, encoding?: string): Promise<void>;
  export function mkdir(path: string, options?: any): Promise<void>;
}

declare module "node:path" {
  export function resolve(...paths: string[]): string;
  export function dirname(path: string): string;
}

declare module "node:url" {
  export function fileURLToPath(url: URL | string): string;
}

declare module "node:http" {
  export interface ServerResponse {
    writeHead(statusCode: number, headers?: Record<string, string | number>): this;
    write(chunk: string): boolean;
    end(chunk?: string): void;
  }
  export interface Server {
    listen(port: number, host: string, callback?: () => void): this;
    close(callback: (error?: Error) => void): void;
  }
  export function createServer(handler: (req: any, res: ServerResponse) => void): Server;
  const http: { createServer: typeof createServer };
  export default http;
}

declare module "node:v8" {
  const v8: {
    getHeapStatistics(): {
      heap_size_limit: number;
      total_available_size: number;
      malloced_memory: number;
    };
  };
  export default v8;
}

declare module "node:perf_hooks" {
  export class PerformanceObserver {
    constructor(callback: (list: { getEntries(): Array<{ duration: number }> }) => void);
    observe(options: { entryTypes: string[] }): void;
  }
  export const performance: {
    eventLoopUtilization(previous?: any): { utilization: number };
  };
}
