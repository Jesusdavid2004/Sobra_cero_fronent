import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { ScannerSummary, Source } from "@/lib/scanner-schemas";

const apiMock = vi.hoisted(() => ({
  scannerSummary: vi.fn(),
  scannerSources: vi.fn(),
  scannerExecutions: vi.fn(),
  scannerProducts: vi.fn(),
  scannerBusinesses: vi.fn(),
  setSourceEnabled: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import { ApiError } from "@/lib/api";

import ScannerDashboard from "./ScannerDashboard";

const messages = en as Record<string, string>;

const summary: ScannerSummary = {
  total_sources: 1,
  active_sources: 0,
  disabled_sources: 1,
  sources_with_errors: 0,
  products_found: 5,
  promotions_detected: 2,
  businesses_discovered: 3,
  rejected_records: 0,
  pending_validation: 3,
  stale_products: 0,
  last_runs: [],
};

const source: Source = {
  key: "exito",
  name: "Éxito pan",
  kind: "jsonld_catalog",
  base_url: "https://www.exito.com/pan",
  enabled: false,
  terms_reviewed: false,
  terms_note: "",
  license_note: "",
  schedule_minutes: null,
  last_run_at: null,
  last_status: "",
  last_stop_reason: "",
};

describe("ScannerDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.scannerSummary.mockResolvedValue(summary);
    apiMock.scannerSources.mockResolvedValue([source]);
    apiMock.scannerExecutions.mockResolvedValue([]);
    apiMock.scannerProducts.mockResolvedValue([]);
    apiMock.scannerBusinesses.mockResolvedValue([]);
  });
  afterEach(cleanup);

  const renderDashboard = () => render(<ScannerDashboard t={messages} locale="en" />);

  it("shows the counters and the registered sources", async () => {
    renderDashboard();

    expect(await screen.findByText("Éxito pan")).toBeTruthy();
    expect(screen.getByText("Products found")).toBeTruthy();
    expect(screen.getByText("Terms not reviewed")).toBeTruthy();
  });

  it("switches between sources, runs, products and discovered businesses", async () => {
    renderDashboard();
    await screen.findByText("Éxito pan");

    fireEvent.click(screen.getByRole("tab", { name: "Runs" }));
    expect(await screen.findByText("No run has happened yet.")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Products and prices" }));
    expect(await screen.findByText("No product collected yet.")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Discovered businesses" }));
    expect(await screen.findByText("No business discovered yet.")).toBeTruthy();
  });

  it("asks only for promotions when that filter is switched on", async () => {
    renderDashboard();
    await screen.findByText("Éxito pan");
    fireEvent.click(screen.getByRole("tab", { name: "Products and prices" }));

    fireEvent.click(await screen.findByLabelText("Only promotions"));

    await waitFor(() => expect(apiMock.scannerProducts).toHaveBeenLastCalledWith(true));
  });

  it("asks only for businesses awaiting validation when that filter is switched on", async () => {
    renderDashboard();
    await screen.findByText("Éxito pan");
    fireEvent.click(screen.getByRole("tab", { name: "Discovered businesses" }));

    fireEvent.click(await screen.findByLabelText("Only awaiting validation"));

    await waitFor(() => expect(apiMock.scannerBusinesses).toHaveBeenLastCalledWith("unverified"));
  });

  it("updates one source in place when it changes", async () => {
    apiMock.setSourceEnabled.mockResolvedValue({ ...source, enabled: true, terms_reviewed: true });
    renderDashboard();
    await screen.findByText("Éxito pan");

    fireEvent.click(screen.getByRole("button", { name: "Enable" }));

    expect(await screen.findByText("Terms reviewed")).toBeTruthy();
    expect(apiMock.scannerSources).toHaveBeenCalledTimes(1);
  });

  it("tells a non-administrator that the Scanner is for administrators and offers a retry", async () => {
    apiMock.scannerSummary.mockRejectedValueOnce(
      new ApiError("x", 403, "scanner_permission_denied"),
    );
    renderDashboard();

    expect((await screen.findByRole("alert")).textContent).toContain(
      "Only administrators can use the Scanner.",
    );
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText("Éxito pan")).toBeTruthy();
  });
});
