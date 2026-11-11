"use client";

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from "react";

import { useLotStream, type LotStreamValue } from "./useLotStream";

const LiveStockContext = createContext<LotStreamValue | null>(null);

const FLASH_MS = 1_200;

type ProviderProps = { lotIds: number[]; children: ReactNode };

/** Opens one stream for every lot on the page and shares it with the live widgets below. */
export function LiveStockProvider({ lotIds, children }: ProviderProps) {
  const value = useLotStream(lotIds);
  return <LiveStockContext.Provider value={value}>{children}</LiveStockContext.Provider>;
}

type IndicatorProps = {
  labels: { live: string; connecting: string; offline: string };
};

export function LiveIndicator({ labels }: IndicatorProps) {
  const stream = useContext(LiveStockContext);
  if (!stream) return null;
  const text = labels[stream.status === "live" ? "live" : stream.status];
  const dot = stream.status === "live" ? "bg-emerald-500" : "bg-stone-400";
  return (
    <p
      role="status"
      className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/80 px-3 py-1 text-xs font-bold text-stone-600"
    >
      <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot}`} />
      {text}
    </p>
  );
}

type QuantityProps = {
  lotId: number;
  initialQuantity: number;
  availableLabel: string;
  soldOutLabel: string;
};

/** Shows the live quantity of a lot and briefly highlights a change made in another session. */
export function LiveQuantity({
  lotId,
  initialQuantity,
  availableLabel,
  soldOutLabel,
}: QuantityProps) {
  const stream = useContext(LiveStockContext);
  const quantity = stream?.states[lotId]?.quantity ?? initialQuantity;
  const previous = useRef(quantity);
  const [flash, setFlash] = useState(false);

  useEffect(() => {
    if (previous.current === quantity) return;
    previous.current = quantity;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), FLASH_MS);
    return () => clearTimeout(timer);
  }, [quantity]);

  return (
    <span className={`rounded-md px-1 transition-colors ${flash ? "bg-orange-100" : ""}`}>
      {quantity === 0 ? soldOutLabel : `${quantity} ${availableLabel}`}
    </span>
  );
}
