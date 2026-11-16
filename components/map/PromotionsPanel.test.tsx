import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import en from "@/i18n/en.json";
import type { Promotion } from "@/lib/map-schemas";

import PromotionsPanel from "./PromotionsPanel";

const messages = en as Record<string, string>;

const promotion = (overrides: Partial<Promotion> = {}): Promotion => ({
  name: "Pan tajado",
  category: "Panadería",
  price_cop: 4990,
  original_price_cop: 7990,
  discount_percent: 38,
  url: "https://tienda.example/pan",
  source_name: "Tienda Demo",
  last_seen_at: "2026-11-16T12:00:00Z",
  ...overrides,
});

describe("PromotionsPanel", () => {
  afterEach(cleanup);

  it("says that a promotion is not a surplus and tells nothing about expiry or stock", () => {
    render(<PromotionsPanel promotions={[promotion()]} t={messages} locale="en" />);

    expect(screen.getByText(/A promotion is not a surplus/)).toBeTruthy();
  });

  it("shows the price, the reference price, the discount, the source and when it was seen", () => {
    render(<PromotionsPanel promotions={[promotion()]} t={messages} locale="en" />);

    expect(screen.getByText("38% off")).toBeTruthy();
    expect(screen.getByText(/4,990/)).toBeTruthy();
    expect(screen.getByText(/7,990/)).toBeTruthy();
    expect(screen.getByText(/From Tienda Demo/)).toBeTruthy();
    expect(screen.getByText(/Seen/)).toBeTruthy();
  });

  it("opens the source page safely in a new tab", () => {
    render(<PromotionsPanel promotions={[promotion()]} t={messages} locale="en" />);

    const link = screen.getByRole("link", { name: "Open the page" });

    expect(link.getAttribute("href")).toBe("https://tienda.example/pan");
    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("target")).toBe("_blank");
  });

  it("explains when there are no recent promotions", () => {
    render(<PromotionsPanel promotions={[]} t={messages} locale="en" />);

    expect(screen.getByText("No recent promotions were collected.")).toBeTruthy();
  });

  it("formats prices in Colombian pesos for Spanish", () => {
    render(
      <PromotionsPanel promotions={[promotion()]} t={en as Record<string, string>} locale="es" />,
    );

    expect(screen.getByText(/4\.990/)).toBeTruthy();
  });
});
