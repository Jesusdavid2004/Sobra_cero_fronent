import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";

const apiMock = vi.hoisted(() => ({ geocode: vi.fn() }));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import { ApiError } from "@/lib/api";

import GeoSearch from "./GeoSearch";

const messages = en as Record<string, string>;
const result = {
  display_name: "Plaza de Nariño, Pasto",
  latitude: 1.2145,
  longitude: -77.2811,
  category: "place",
  attribution: "© OpenStreetMap contributors",
};

const submit = (text: string) => {
  fireEvent.change(screen.getByLabelText("Go to an address or landmark"), {
    target: { value: text },
  });
  fireEvent.click(screen.getByRole("button", { name: "Go" }));
};

describe("GeoSearch", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("does not search while typing, only on submit", () => {
    render(<GeoSearch t={messages} onPick={vi.fn()} />);

    fireEvent.change(screen.getByLabelText("Go to an address or landmark"), {
      target: { value: "plaza de nariño" },
    });

    expect(apiMock.geocode).not.toHaveBeenCalled();
  });

  it("rejects a search shorter than three characters without calling the API", () => {
    render(<GeoSearch t={messages} onPick={vi.fn()} />);

    submit("ab");

    expect(screen.getByRole("alert").textContent).toBe("Type at least three characters.");
    expect(apiMock.geocode).not.toHaveBeenCalled();
  });

  it("lists the results and reports the one the visitor picks", async () => {
    apiMock.geocode.mockResolvedValue([result]);
    const onPick = vi.fn();
    render(<GeoSearch t={messages} onPick={onPick} />);

    submit("plaza de nariño");
    fireEvent.click(await screen.findByRole("button", { name: "Plaza de Nariño, Pasto" }));

    expect(apiMock.geocode).toHaveBeenCalledWith("plaza de nariño");
    expect(onPick).toHaveBeenCalledWith(result);
  });

  it("says when nothing matched", async () => {
    apiMock.geocode.mockResolvedValue([]);
    render(<GeoSearch t={messages} onPick={vi.fn()} />);

    submit("zzzz nowhere");

    expect(await screen.findByText("No place matches that search.")).toBeTruthy();
  });

  it.each([
    ["rate_limited", "Too many searches. Wait a minute and try again."],
    ["geocoder_unavailable", "The place search is not available right now."],
  ])("explains a %s failure in the visitor's language", async (code, message) => {
    apiMock.geocode.mockRejectedValue(new ApiError("failed", 503, code));
    render(<GeoSearch t={messages} onPick={vi.fn()} />);

    submit("plaza de nariño");

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe(message));
  });
});
