import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { OpportunityCell } from "@/lib/map-schemas";

import OpportunityPanel from "./OpportunityPanel";

const messages = en as Record<string, string>;

const cell = (overrides: Partial<OpportunityCell> = {}): OpportunityCell => ({
  south: 1.21,
  west: -77.29,
  center_latitude: 1.215,
  center_longitude: -77.285,
  affiliated_shops: 1,
  live_offers: 2,
  receivers: 0,
  discovered_businesses: 3,
  total: 6,
  somewhere_to_invite: false,
  ...overrides,
});

describe("OpportunityPanel", () => {
  afterEach(cleanup);

  it("states that the counts do not estimate waste or demand", () => {
    render(<OpportunityPanel cells={[cell()]} t={messages} onFocus={vi.fn()} />);

    expect(screen.getByText(/does not estimate waste or demand/)).toBeTruthy();
  });

  it("describes each area with verifiable counts only", () => {
    render(<OpportunityPanel cells={[cell()]} t={messages} onFocus={vi.fn()} />);

    expect(
      screen.getByText("1 shops, 2 offers, 0 receivers, 3 found in public sources"),
    ).toBeTruthy();
  });

  it("flags an area with businesses found and none affiliated as a place to invite", () => {
    render(
      <OpportunityPanel
        cells={[cell({ affiliated_shops: 0, live_offers: 0, somewhere_to_invite: true })]}
        t={messages}
        onFocus={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Businesses found here and none affiliated yet: a place to invite."),
    ).toBeTruthy();
  });

  it("does not flag an area that already has an affiliated shop", () => {
    render(<OpportunityPanel cells={[cell()]} t={messages} onFocus={vi.fn()} />);

    expect(screen.queryByText(/a place to invite/)).toBeNull();
  });

  it("reports the area the visitor chooses", () => {
    const onFocus = vi.fn();
    render(<OpportunityPanel cells={[cell()]} t={messages} onFocus={onFocus} />);

    fireEvent.click(screen.getByRole("button"));

    expect(onFocus).toHaveBeenCalledWith(expect.objectContaining({ south: 1.21 }));
  });

  it("says when no area has records", () => {
    render(<OpportunityPanel cells={[]} t={messages} onFocus={vi.fn()} />);

    expect(screen.getByText("No area has records yet.")).toBeTruthy();
  });

  it("shows at most eight areas", () => {
    const many = Array.from({ length: 12 }, (_, index) => cell({ south: 1 + index / 100 }));
    render(<OpportunityPanel cells={many} t={messages} onFocus={vi.fn()} />);

    expect(screen.getAllByRole("button")).toHaveLength(8);
  });
});
