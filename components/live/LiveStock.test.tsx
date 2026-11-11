import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { LotStreamValue } from "./useLotStream";

const stream = vi.hoisted(() => ({
  value: { states: {}, status: "live" } as LotStreamValue,
}));

vi.mock("./useLotStream", () => ({ useLotStream: () => stream.value }));

import { LiveIndicator, LiveQuantity, LiveStockProvider } from "./LiveStock";

const labels = { live: "Live stock", connecting: "Connecting...", offline: "Offline" };

function Card({ initialQuantity = 5 }: { initialQuantity?: number }) {
  return (
    <LiveStockProvider lotIds={[1]}>
      <LiveIndicator labels={labels} />
      <LiveQuantity
        lotId={1}
        initialQuantity={initialQuantity}
        availableLabel="available"
        soldOutLabel="Sold out"
      />
    </LiveStockProvider>
  );
}

const lotState = (quantity: number, status = "active") => ({
  1: { lot_id: 1, version: 2, quantity, status, discount_percent: 30 },
});

describe("live stock widgets", () => {
  beforeEach(() => {
    stream.value = { states: {}, status: "live" };
  });
  afterEach(cleanup);

  it("shows the server-rendered quantity until the stream reports a change", () => {
    render(<Card initialQuantity={5} />);

    expect(screen.getByText("5 available")).toBeTruthy();
  });

  it("shows the quantity pushed by another session", () => {
    stream.value = { status: "live", states: lotState(2) };

    render(<Card />);

    expect(screen.getByText("2 available")).toBeTruthy();
  });

  it("shows sold out when the stock reaches zero", () => {
    stream.value = { status: "live", states: lotState(0, "sold_out") };

    render(<Card />);

    expect(screen.getByText("Sold out")).toBeTruthy();
  });

  it("reports the connection state to the user", () => {
    const { rerender } = render(<Card />);
    expect(screen.getByRole("status").textContent).toBe("Live stock");

    stream.value = { states: {}, status: "offline" };
    act(() => rerender(<Card />));

    expect(screen.getByRole("status").textContent).toBe("Offline");
  });

  it("renders nothing for the indicator outside a provider", () => {
    render(<LiveIndicator labels={labels} />);

    expect(screen.queryByRole("status")).toBeNull();
  });
});
