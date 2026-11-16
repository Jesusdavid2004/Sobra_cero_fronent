import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { DiscoveredBusiness } from "@/lib/scanner-schemas";

const apiMock = vi.hoisted(() => ({ verifyBusiness: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import { ApiError } from "@/lib/api";

import BusinessesTable from "./BusinessesTable";

const messages = en as Record<string, string>;

const business = (overrides: Partial<DiscoveredBusiness> = {}): DiscoveredBusiness => ({
  id: 9,
  source_key: "osm",
  name: "Panadería El Trigo",
  category: "bakery",
  address: "Calle 18 25-10",
  latitude: 1.2136,
  longitude: -77.2811,
  affiliation: "discovered",
  verification_status: "unverified",
  is_demo: false,
  last_seen_at: "2026-11-16T12:00:00Z",
  freshness: "fresh",
  ...overrides,
});

describe("BusinessesTable", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("says when nothing was discovered", () => {
    render(<BusinessesTable businesses={[]} t={messages} locale="en" onChanged={vi.fn()} />);

    expect(screen.getByText("No business discovered yet.")).toBeTruthy();
  });

  it("always labels a discovered business as not affiliated", () => {
    render(
      <BusinessesTable businesses={[business()]} t={messages} locale="en" onChanged={vi.fn()} />,
    );

    expect(screen.getByText("Found in a source, not affiliated")).toBeTruthy();
    expect(screen.getByText("Awaiting validation")).toBeTruthy();
    expect(screen.getByText(/Bakeries · osm/)).toBeTruthy();
  });

  it("marks demonstration data and out-of-date records", () => {
    render(
      <BusinessesTable
        businesses={[business({ is_demo: true, freshness: "stale" })]}
        t={messages}
        locale="en"
        onChanged={vi.fn()}
      />,
    );

    expect(screen.getByText("Demonstration data")).toBeTruthy();
    expect(screen.getByText(/Out of date/)).toBeTruthy();
  });

  it("lets a person verify or reject a business that is awaiting validation", async () => {
    apiMock.verifyBusiness.mockResolvedValue(undefined);
    const onChanged = vi.fn();
    render(
      <BusinessesTable businesses={[business()]} t={messages} locale="en" onChanged={onChanged} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    await waitFor(() => expect(onChanged).toHaveBeenCalledOnce());
    expect(apiMock.verifyBusiness).toHaveBeenCalledWith(9, "verified");

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));

    await waitFor(() => expect(apiMock.verifyBusiness).toHaveBeenLastCalledWith(9, "rejected"));
  });

  it("offers no decision for a business that was already decided", () => {
    render(
      <BusinessesTable
        businesses={[business({ verification_status: "verified" })]}
        t={messages}
        locale="en"
        onChanged={vi.fn()}
      />,
    );

    expect(screen.queryByRole("button", { name: "Verify" })).toBeNull();
    expect(screen.getByText("Verified")).toBeTruthy();
  });

  it("shows a translated error when the decision fails", async () => {
    apiMock.verifyBusiness.mockRejectedValue(new ApiError("x", 404, "scanner_source_not_found"));
    render(
      <BusinessesTable businesses={[business()]} t={messages} locale="en" onChanged={vi.fn()} />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Verify" }));

    expect((await screen.findByRole("alert")).textContent).toBe("That source does not exist.");
  });
});
