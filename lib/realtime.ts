import { z } from "zod";

/**
 * Client of the public lot stream. The socket only reports stock facts; everything that changes
 * data still goes through the HTTPS API. Events can be lost, so after every (re)connect the client
 * subscribes again and receives a fresh snapshot.
 */

const LotStateSchema = z.object({
  lot_id: z.number().int(),
  version: z.number().int(),
  quantity: z.number().int(),
  status: z.string(),
  discount_percent: z.number().int(),
});

const ServerMessageSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("snapshot"), lots: z.array(LotStateSchema) }),
  LotStateSchema.extend({ type: z.literal("lot.stock_changed"), occurred_at: z.string() }),
  z.object({ type: z.literal("error"), code: z.string() }),
  z.object({ type: z.literal("pong") }),
]);

export type LotState = z.infer<typeof LotStateSchema>;
export type LotStates = Record<number, LotState>;
export type StreamStatus = "connecting" | "live" | "offline";

export const STREAM_PATH = "/ws/lots";
export const INITIAL_BACKOFF_MS = 1_000;
export const MAX_BACKOFF_MS = 30_000;
const BACKOFF_FACTOR = 2;
const JITTER_RATIO = 0.25;

/** `https://api.example.com/api/v1` becomes `wss://api.example.com/api/v1/ws/lots`. */
export function streamUrl(apiBase: string): string {
  return `${apiBase.replace(/^http/, "ws").replace(/\/$/, "")}${STREAM_PATH}`;
}

/** Exponential backoff with a cap; `random` is injectable so the delay is testable. */
export function backoffDelay(attempt: number, random: () => number = Math.random): number {
  const base = Math.min(MAX_BACKOFF_MS, INITIAL_BACKOFF_MS * BACKOFF_FACTOR ** attempt);
  return Math.round(base * (1 - JITTER_RATIO + random() * JITTER_RATIO));
}

/** Keep the newest known state of each lot; an older or equal version never wins. */
export function mergeLotStates(current: LotStates, incoming: LotState[]): LotStates {
  let next = current;
  for (const state of incoming) {
    const known = next[state.lot_id];
    if (known && known.version >= state.version) continue;
    next = { ...next, [state.lot_id]: state };
  }
  return next;
}

export type SocketLike = {
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onmessage: ((event: { data: unknown }) => void) | null;
  onclose: (() => void) | null;
  onerror: (() => void) | null;
};

type StreamOptions = {
  url: string;
  lotIds: number[];
  onStates: (states: LotState[]) => void;
  onStatus: (status: StreamStatus) => void;
  createSocket?: (url: string) => SocketLike;
  schedule?: (callback: () => void, delayMs: number) => ReturnType<typeof setTimeout>;
  random?: () => number;
};

export type LotStream = { close: () => void };

function parseMessage(data: unknown) {
  if (typeof data !== "string") return null;
  try {
    const parsed = ServerMessageSchema.safeParse(JSON.parse(data));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function openLotStream(options: StreamOptions): LotStream {
  const createSocket =
    options.createSocket ?? ((url: string) => new WebSocket(url) as unknown as SocketLike);
  const schedule = options.schedule ?? setTimeout;
  let socket: SocketLike | null = null;
  let attempt = 0;
  let closed = false;
  let retryTimer: ReturnType<typeof setTimeout> | undefined;

  const connect = () => {
    options.onStatus("connecting");
    const current = createSocket(options.url);
    socket = current;
    current.onopen = () => {
      attempt = 0;
      current.send(JSON.stringify({ action: "subscribe", lot_ids: options.lotIds }));
    };
    current.onmessage = (event) => {
      const message = parseMessage(event.data);
      if (!message) return;
      if (message.type === "snapshot") {
        options.onStates(message.lots);
        options.onStatus("live");
      } else if (message.type === "lot.stock_changed") {
        options.onStates([message]);
      }
    };
    current.onclose = () => {
      if (closed) return;
      options.onStatus("offline");
      retryTimer = schedule(connect, backoffDelay(attempt++, options.random));
    };
    current.onerror = () => current.close();
  };

  connect();

  return {
    close: () => {
      closed = true;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
      if (socket) {
        socket.onclose = null;
        socket.close();
      }
    },
  };
}
