import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { ScraperRecord } from "@/lib/scanner-schemas";

const apiMock = vi.hoisted(() => ({ scannerRecords: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import { ApiError } from "@/lib/api";

import RecordsPanel from "./RecordsPanel";

const messages = en as Record<string, string>;

const record = (overrides: Partial<ScraperRecord> = {}): ScraperRecord => ({
  id: 1,
  kind: "product",
  status: "rejected",
  reason: "invalid_price",
  source_url: "https://tienda.example/regalo",
  payload: '{"name": "Producto regalo", "price": "gratis"}',
  created_at: "2026-11-16T12:00:00Z",
  ...overrides,
});

describe("RecordsPanel", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("lists each rejected record with a plain-language reason, its address and what was read", async () => {
    apiMock.scannerRecords.mockResolvedValue([record()]);
    render(<RecordsPanel executionId={7} t={messages} locale="en" />);

    expect(await screen.findByText("No valid price in pesos")).toBeTruthy();
    expect(screen.getByText("https://tienda.example/regalo")).toBeTruthy();
    expect(screen.getByText(/Producto regalo/)).toBeTruthy();
    expect(apiMock.scannerRecords).toHaveBeenCalledWith(7);
  });

  it("falls back to the raw code for a reason it does not know", async () => {
    apiMock.scannerRecords.mockResolvedValue([record({ reason: "new_reason" })]);
    render(<RecordsPanel executionId={7} t={messages} locale="en" />);

    expect(await screen.findByText("new_reason")).toBeTruthy();
  });

  it("says when a run rejected nothing", async () => {
    apiMock.scannerRecords.mockResolvedValue([]);
    render(<RecordsPanel executionId={7} t={messages} locale="en" />);

    expect(await screen.findByText("This run rejected nothing.")).toBeTruthy();
  });

  it("shows a translated error when the records cannot be read", async () => {
    apiMock.scannerRecords.mockRejectedValue(new ApiError("x", 403, "scanner_permission_denied"));
    render(<RecordsPanel executionId={7} t={messages} locale="en" />);

    expect((await screen.findByRole("alert")).textContent).toBe(
      "Only administrators can use the Scanner.",
    );
  });
});
