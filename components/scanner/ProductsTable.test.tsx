import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { CollectedProduct } from "@/lib/scanner-schemas";

const apiMock = vi.hoisted(() => ({ scannerPriceHistory: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import ProductsTable from "./ProductsTable";

const messages = en as Record<string, string>;

const product = (overrides: Partial<CollectedProduct> = {}): CollectedProduct => ({
  id: 4,
  source_key: "exito",
  name: "Pan tajado",
  category: "Panadería",
  url: "https://tienda.example/pan",
  shop_name: "Tienda",
  price_cop: 4990,
  original_price_cop: 7990,
  discount_percent: 38,
  availability: "InStock",
  last_seen_at: "2026-11-16T12:00:00Z",
  freshness: "fresh",
  ...overrides,
});

const history = [
  {
    observed_at: "2026-11-14T12:00:00Z",
    price_cop: 5990,
    original_price_cop: 7990,
    discount_percent: 25,
  },
  {
    observed_at: "2026-11-16T12:00:00Z",
    price_cop: 4990,
    original_price_cop: 7990,
    discount_percent: 38,
  },
];

describe("ProductsTable", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("says when nothing was collected", () => {
    render(<ProductsTable products={[]} t={messages} locale="en" />);

    expect(screen.getByText("No product collected yet.")).toBeTruthy();
  });

  it("shows the price, the reference price, the discount and that the data is up to date", () => {
    render(<ProductsTable products={[product()]} t={messages} locale="en" />);

    expect(screen.getByText("38% off")).toBeTruthy();
    expect(screen.getByText(/Up to date/)).toBeTruthy();
    expect(screen.getByText(/4,990/)).toBeTruthy();
    expect(screen.queryByRole("note")).toBeNull();
  });

  it("warns that a stale price must not be read as the current one", () => {
    render(<ProductsTable products={[product({ freshness: "stale" })]} t={messages} locale="en" />);

    expect(screen.getByRole("note").textContent).toContain(
      "Out of date: do not treat it as the current price",
    );
  });

  it("loads and draws the price history when asked", async () => {
    apiMock.scannerPriceHistory.mockResolvedValue(history);
    render(<ProductsTable products={[product()]} t={messages} locale="en" />);

    fireEvent.click(screen.getByRole("button", { name: "Show price history" }));

    expect(await screen.findByRole("img", { name: "Price history" })).toBeTruthy();
    expect(screen.getAllByText(/\$\s?5,990|COP\s?5,990/).length).toBeGreaterThan(0);
    expect(apiMock.scannerPriceHistory).toHaveBeenCalledWith(4);
  });

  it("opens the source page safely", () => {
    render(<ProductsTable products={[product()]} t={messages} locale="en" />);

    const link = screen.getByRole("link", { name: "Open the page" });

    expect(link.getAttribute("rel")).toContain("noopener");
    expect(link.getAttribute("target")).toBe("_blank");
  });
});
