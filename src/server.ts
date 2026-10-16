import http, { type Server, type ServerResponse } from "node:http";
import { dashboardHtml } from "./dashboard/html.js";
import type { SessionState } from "./core/types.js";

export interface DashboardServer {
  server: Server;
  broadcast(state: SessionState): void;
  close(): Promise<void>;
}

export function createDashboardServer(
  stateProvider: () => SessionState,
  entry: string,
  host: string,
  port: number
): DashboardServer {
  const clients = new Set<ServerResponse>();

  const push = (response: ServerResponse, state: SessionState) => {
    response.write("event: state\n");
    response.write(`data: ${JSON.stringify(state)}\n\n`);
  };

  const server = http.createServer((req, res) => {
    const url = new URL(req.url ?? "/", `http://${host}:${port}`);

    if (req.method === "GET" && url.pathname === "/") {
      const html = dashboardHtml(entry);
      res.writeHead(200, {
        "content-type": "text/html; charset=utf-8",
        "content-length": Buffer.byteLength(html),
        "cache-control": "no-store"
      });
      res.end(html);
      return;
    }

    if (req.method === "GET" && url.pathname === "/events") {
      res.writeHead(200, {
        "content-type": "text/event-stream; charset=utf-8",
        "cache-control": "no-cache, no-transform",
        connection: "keep-alive"
      });
      res.write(": heapgarden\n\n");
      clients.add(res);
      push(res, stateProvider());
      req.on("close", () => clients.delete(res));
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/state") {
      const body = JSON.stringify(stateProvider());
      res.writeHead(200, {
        "content-type": "application/json; charset=utf-8",
        "content-length": Buffer.byteLength(body),
        "cache-control": "no-store"
      });
      res.end(body);
      return;
    }

    res.writeHead(404, { "content-type": "application/json; charset=utf-8" });
    res.end(JSON.stringify({ error: "not_found" }));
  });

  return {
    server,
    broadcast(state) {
      for (const client of clients) push(client, state);
    },
    close: () => new Promise<void>((resolve, reject) => {
      for (const client of clients) client.end();
      server.close((error) => error ? reject(error) : resolve());
    })
  };
}
