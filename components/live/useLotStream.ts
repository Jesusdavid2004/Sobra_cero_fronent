"use client";

import { useEffect, useMemo, useState } from "react";

import { API_BASE } from "@/lib/api";
import {
  mergeLotStates,
  openLotStream,
  streamUrl,
  type LotState,
  type LotStates,
  type StreamStatus,
} from "@/lib/realtime";

export type LotStreamValue = { states: LotStates; status: StreamStatus };

/** Live state of the given lots. Falls back to `offline` where WebSockets are unavailable. */
export function useLotStream(lotIds: number[]): LotStreamValue {
  const [states, setStates] = useState<LotStates>({});
  const [status, setStatus] = useState<StreamStatus>("connecting");
  const key = useMemo(() => [...lotIds].sort((a, b) => a - b).join(","), [lotIds]);

  useEffect(() => {
    if (!key || typeof WebSocket === "undefined") return;
    const stream = openLotStream({
      url: streamUrl(API_BASE),
      lotIds: key.split(",").map(Number),
      onStates: (incoming: LotState[]) => setStates((current) => mergeLotStates(current, incoming)),
      onStatus: setStatus,
    });
    return () => stream.close();
  }, [key]);

  return { states, status };
}
