import { describe, expect, it, vi } from "vitest";

import {
  backoffDelay,
  INITIAL_BACKOFF_MS,
  MAX_BACKOFF_MS,
  mergeLotStates,
  openLotStream,
  streamUrl,
  type LotState,
  type SocketLike,
} from "./realtime";

const state = (overrides: Partial<LotState> = {}): LotState => ({
  lot_id: 1,
  version: 1,
  quantity: 5,
  status: "active",
  discount_percent: 30,
  ...overrides,
});

class FakeSocket implements SocketLike {
  sent: string[] = [];
  closed = false;
  onopen: (() => void) | null = null;
  onmessage: ((event: { data: unknown }) => void) | null = null;
  onclose: (() => void) | null = null;
  onerror: (() => void) | null = null;
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
    this.onclose?.();
  }
  receive(payload: unknown) {
    this.onmessage?.({ data: typeof payload === "string" ? payload : JSON.stringify(payload) });
  }
}

function setup() {
  const sockets: FakeSocket[] = [];
  const timers: { callback: () => void; delayMs: number }[] = [];
  const onStates = vi.fn();
  const onStatus = vi.fn();
  const stream = openLotStream({
    url: "wss://api.example.com/api/v1/ws/lots",
    lotIds: [1, 2],
    onStates,
    onStatus,
    createSocket: () => {
      const socket = new FakeSocket();
      sockets.push(socket);
      return socket;
    },
    schedule: ((callback: () => void, delayMs: number) => {
      timers.push({ callback, delayMs });
      return 0 as unknown as ReturnType<typeof setTimeout>;
    }) as never,
    random: () => 0,
  });
  return { stream, sockets, timers, onStates, onStatus };
}

describe("streamUrl", () => {
  it("turns the API base into a WebSocket URL", () => {
    expect(streamUrl("https://api.example.com/api/v1")).toBe(
      "wss://api.example.com/api/v1/ws/lots",
    );
    expect(streamUrl("http://localhost:8000/api/v1/")).toBe("ws://localhost:8000/api/v1/ws/lots");
  });
});

describe("backoffDelay", () => {
  it("grows exponentially and stops at the cap", () => {
    const delays = [0, 1, 2, 3, 10].map((attempt) => backoffDelay(attempt, () => 1));

    expect(delays[0]).toBe(INITIAL_BACKOFF_MS);
    expect(delays[1]).toBe(INITIAL_BACKOFF_MS * 2);
    expect(delays[2]).toBe(INITIAL_BACKOFF_MS * 4);
    expect(delays[4]).toBe(MAX_BACKOFF_MS);
  });

  it("never waits less than three quarters of the base delay", () => {
    expect(backoffDelay(0, () => 0)).toBe(INITIAL_BACKOFF_MS * 0.75);
  });
});

describe("mergeLotStates", () => {
  it("applies newer versions and ignores older or repeated ones", () => {
    const first = mergeLotStates({}, [state({ version: 3, quantity: 2 })]);

    expect(mergeLotStates(first, [state({ version: 2, quantity: 9 })])[1].quantity).toBe(2);
    expect(mergeLotStates(first, [state({ version: 3, quantity: 9 })])[1].quantity).toBe(2);
    expect(mergeLotStates(first, [state({ version: 4, quantity: 1 })])[1].quantity).toBe(1);
  });

  it("keeps lots independent", () => {
    const merged = mergeLotStates({}, [state({ lot_id: 1 }), state({ lot_id: 2, quantity: 8 })]);

    expect(Object.keys(merged)).toEqual(["1", "2"]);
  });
});

describe("openLotStream", () => {
  it("subscribes on open and reports live after the snapshot", () => {
    const { sockets, onStates, onStatus } = setup();

    sockets[0].onopen?.();
    expect(JSON.parse(sockets[0].sent[0])).toEqual({ action: "subscribe", lot_ids: [1, 2] });
    sockets[0].receive({ type: "snapshot", lots: [state()] });

    expect(onStates).toHaveBeenCalledWith([state()]);
    expect(onStatus).toHaveBeenLastCalledWith("live");
  });

  it("forwards stock events and ignores malformed frames", () => {
    const { sockets, onStates } = setup();
    sockets[0].onopen?.();

    sockets[0].receive({
      ...state({ version: 2, quantity: 3 }),
      type: "lot.stock_changed",
      occurred_at: "now",
    });
    sockets[0].receive("not json");
    sockets[0].receive({ type: "unknown" });

    expect(onStates).toHaveBeenCalledTimes(1);
    expect(onStates.mock.calls[0][0][0].quantity).toBe(3);
  });

  it("reconnects with backoff and subscribes again to get a fresh snapshot", () => {
    const { sockets, timers, onStatus } = setup();
    sockets[0].onopen?.();
    sockets[0].receive({ type: "snapshot", lots: [state()] });

    sockets[0].onclose?.();
    expect(onStatus).toHaveBeenLastCalledWith("offline");
    expect(timers[0].delayMs).toBe(INITIAL_BACKOFF_MS * 0.75);

    timers[0].callback();
    sockets[1].onopen?.();

    expect(sockets).toHaveLength(2);
    expect(JSON.parse(sockets[1].sent[0]).action).toBe("subscribe");
  });

  it("does not reconnect after it was closed on purpose", () => {
    const { stream, sockets, timers } = setup();
    sockets[0].onopen?.();

    stream.close();

    expect(sockets[0].closed).toBe(true);
    expect(timers).toHaveLength(0);
  });
});
