import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import { DEFAULT_FILTERS } from "@/lib/map";

import MapFilters from "./MapFilters";

const messages = en as Record<string, string>;

const renderFilters = (onChange = vi.fn(), filters = DEFAULT_FILTERS) => {
  render(<MapFilters filters={filters} t={messages} onChange={onChange} />);
  return onChange;
};

describe("MapFilters", () => {
  afterEach(cleanup);

  it("starts with every layer checked and offers a legend that tells the markers apart", () => {
    renderFilters();

    expect((screen.getByLabelText("Affiliated shops") as HTMLInputElement).checked).toBe(true);
    expect((screen.getByLabelText("Found in public sources") as HTMLInputElement).checked).toBe(
      true,
    );
    expect(screen.getByText("Solid disc: affiliated shop")).toBeTruthy();
    expect(screen.getByText("Dashed ring: found in a public source, not affiliated")).toBeTruthy();
  });

  it("turns a layer off", () => {
    const onChange = renderFilters();

    fireEvent.click(screen.getByLabelText("Found in public sources"));

    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ layers: ["affiliated", "receivers"] }),
    );
  });

  it("selects a category and reports it as pressed", () => {
    const onChange = renderFilters();

    fireEvent.click(screen.getByRole("button", { name: "Bakeries" }));

    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categories: ["bakery"] }));
  });

  it("shows which categories are active", () => {
    renderFilters(vi.fn(), { ...DEFAULT_FILTERS, categories: ["cafe"] });

    expect(screen.getByRole("button", { name: "Cafes" }).getAttribute("aria-pressed")).toBe("true");
    expect(screen.getByRole("button", { name: "Bakeries" }).getAttribute("aria-pressed")).toBe(
      "false",
    );
  });

  it("reports the text typed, the offers-only switch and the opportunities overlay", () => {
    const onChange = renderFilters();

    fireEvent.change(screen.getByLabelText("Filter places by name"), { target: { value: "pan" } });
    fireEvent.click(screen.getByLabelText("Only shops with live offers"));
    fireEvent.click(screen.getByLabelText("Show where activity is concentrated"));

    expect(onChange).toHaveBeenNthCalledWith(1, expect.objectContaining({ text: "pan" }));
    expect(onChange).toHaveBeenNthCalledWith(2, expect.objectContaining({ onlyWithOffers: true }));
    expect(onChange).toHaveBeenNthCalledWith(
      3,
      expect.objectContaining({ showOpportunities: true }),
    );
  });
});
