import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import en from "@/i18n/en.json";
import type { ScannerSummary } from "@/lib/scanner-schemas";

import SummaryCards from "./SummaryCards";

const messages = en as Record<string, string>;

const summary = (overrides: Partial<ScannerSummary> = {}): ScannerSummary => ({
  total_sources: 3,
  active_sources: 2,
  disabled_sources: 1,
  sources_with_errors: 0,
  products_found: 1200,
  promotions_detected: 40,
  businesses_discovered: 85,
  rejected_records: 0,
  pending_validation: 12,
  stale_products: 0,
  last_runs: [],
  ...overrides,
});

describe("SummaryCards", () => {
  afterEach(cleanup);

  it("shows every counter the control center needs", () => {
    render(<SummaryCards summary={summary()} t={messages} locale="en" />);

    for (const label of [
      "Sources",
      "Active",
      "Disabled",
      "With problems",
      "Products found",
      "Promotions detected",
      "Businesses discovered",
      "Records rejected",
      "Pending validation",
      "Out-of-date prices",
    ]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    expect(screen.getByText("1,200")).toBeTruthy();
  });

  it("formats numbers for the visitor's language", () => {
    render(<SummaryCards summary={summary()} t={messages} locale="es" />);

    expect(screen.getByText("1.200")).toBeTruthy();
  });

  it("highlights only the counters that need attention and are not zero", () => {
    render(
      <SummaryCards
        summary={summary({ sources_with_errors: 1, stale_products: 5 })}
        t={messages}
        locale="en"
      />,
    );

    const card = (label: string) => screen.getByText(label).parentElement as HTMLElement;
    expect(card("With problems").className).toContain("bg-cf5dcec");
    expect(card("Out-of-date prices").className).toContain("bg-cf5dcec");
    expect(card("Records rejected").className).not.toContain("bg-cf5dcec");
    expect(card("Products found").className).not.toContain("bg-cf5dcec");
  });

  it("reminds the reader that collected data says nothing about stock, expiry or surplus", () => {
    render(<SummaryCards summary={summary()} t={messages} locale="en" />);

    expect(screen.getByText(/says nothing about stock, expiry or surplus/)).toBeTruthy();
  });
});
