import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import type { DonationOffer, Receiver, ReceiverAssessment, ReceiverCandidates } from "@/lib/api";

const apiMock = vi.hoisted(() => ({
  donationCandidates: vi.fn(),
  draftDonationMessage: vi.fn(),
  createDonationOffer: vi.fn(),
  lotDonationOffers: vi.fn(),
  confirmDonationDelivery: vi.fn(),
  myReceiver: vi.fn(),
  myReceiverOffers: vi.fn(),
  answerDonationOffer: vi.fn(),
  registerReceiver: vi.fn(),
}));

vi.mock("@/lib/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api")>()),
  api: apiMock,
}));

import { ApiError } from "@/lib/api";

import DonationOfferPanel from "./DonationOfferPanel";
import ReceiverPanel from "./ReceiverPanel";

const messages = en as Record<string, string>;

const receiver = (overrides: Partial<Receiver> = {}): Receiver => ({
  id: 1,
  name: "Community kitchen",
  latitude: 4.7,
  longitude: -74,
  accepted_categories: ["bakery"],
  max_quantity: 50,
  can_store_refrigerated: false,
  open_from: "09:00",
  open_until: "17:00",
  utc_offset_minutes: 0,
  ...overrides,
});

const assessment = (overrides: Partial<ReceiverAssessment> = {}): ReceiverAssessment => ({
  receiver: receiver(),
  distance_km: 2.5,
  travel_minutes: 8,
  recent_accepted: 1,
  reasons: [],
  ...overrides,
});

const offer = (overrides: Partial<DonationOffer> = {}): DonationOffer => ({
  id: 9,
  lot_id: 3,
  lot_title: "Bread bag",
  category: "bakery",
  shop_name: "Green Bakery",
  receiver_name: "Community kitchen",
  quantity: 5,
  status: "offered",
  message: "Hello",
  closes_at: "2026-11-10T18:00:00Z",
  created_at: "2026-11-10T10:00:00Z",
  decided_at: null,
  delivered_at: null,
  ...overrides,
});

const candidates = (overrides: Partial<ReceiverCandidates> = {}): ReceiverCandidates => ({
  approximate: true,
  compatible: [assessment()],
  excluded: [],
  ...overrides,
});

describe("DonationOfferPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    apiMock.lotDonationOffers.mockResolvedValue([]);
  });
  afterEach(cleanup);

  const renderPanel = () =>
    render(<DonationOfferPanel lotId={3} defaultQuantity={14} t={messages} locale="en" />);

  it("lists compatible receivers and says why the others were left out", async () => {
    apiMock.donationCandidates.mockResolvedValue(
      candidates({
        excluded: [
          assessment({
            receiver: receiver({ id: 2, name: "Dairy only" }),
            reasons: ["category_not_accepted"],
          }),
        ],
      }),
    );
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Find compatible receivers" }));

    expect(await screen.findByText("Community kitchen")).toBeTruthy();
    expect(apiMock.donationCandidates).toHaveBeenCalledWith(3, 14);
    expect(screen.getByText("Left out (1)")).toBeTruthy();
    expect(screen.getByText("does not accept this food")).toBeTruthy();
  });

  it("drafts a message with AI, keeps it editable and sends the offer the owner reviewed", async () => {
    apiMock.donationCandidates.mockResolvedValue(candidates());
    apiMock.draftDonationMessage.mockResolvedValue({ text: "We have bread to share." });
    apiMock.createDonationOffer.mockResolvedValue(offer());
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Find compatible receivers" }));
    fireEvent.click(await screen.findByRole("radio"));
    fireEvent.click(screen.getByRole("button", { name: "Draft with AI" }));
    const box = (await screen.findByLabelText("Message to the receiver")) as HTMLTextAreaElement;
    await waitFor(() => expect(box.value).toBe("We have bread to share."));
    fireEvent.change(box, { target: { value: "We have bread to share. Come by." } });
    fireEvent.click(screen.getByRole("button", { name: "Send offer" }));

    await waitFor(() =>
      expect(apiMock.createDonationOffer).toHaveBeenCalledWith(3, {
        receiverId: 1,
        quantity: 14,
        message: "We have bread to share. Come by.",
      }),
    );
  });

  it("offers delivery confirmation only for accepted offers", async () => {
    apiMock.lotDonationOffers.mockResolvedValue([
      offer({ id: 1, status: "offered" }),
      offer({ id: 2, status: "accepted", receiver_name: "Food bank" }),
    ]);
    apiMock.confirmDonationDelivery.mockResolvedValue(offer({ id: 2, status: "delivered" }));
    renderPanel();

    const confirm = await screen.findAllByRole("button", { name: "Confirm delivery" });
    expect(confirm).toHaveLength(1);
    fireEvent.click(confirm[0]);

    await waitFor(() => expect(apiMock.confirmDonationDelivery).toHaveBeenCalledWith(2));
  });

  it("shows a translated message for a known error code", async () => {
    apiMock.donationCandidates.mockRejectedValue(
      new ApiError("conflict", 409, "donation_quantity_invalid"),
    );
    renderPanel();

    fireEvent.click(screen.getByRole("button", { name: "Find compatible receivers" }));

    expect(
      await screen.findByText("Choose a quantity between one and what is available."),
    ).toBeTruthy();
  });
});

describe("ReceiverPanel", () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(cleanup);

  it("shows the profile form when the account has no receiver profile yet", async () => {
    apiMock.myReceiver.mockRejectedValue(new ApiError("not found", 404, "receiver_not_found"));
    render(<ReceiverPanel t={messages} locale="en" />);

    expect(await screen.findByText("Your receiver profile")).toBeTruthy();
    expect(
      (screen.getByRole("button", { name: "Save profile" }) as HTMLButtonElement).disabled,
    ).toBe(true);
  });

  it("asks an anonymous visitor to log in", async () => {
    apiMock.myReceiver.mockRejectedValue(new ApiError("unauthorized", 401));
    render(<ReceiverPanel t={messages} locale="en" />);

    expect(
      await screen.findByText("Log in to create a receiver profile or see your offers."),
    ).toBeTruthy();
  });

  it("lets the receiver accept an offer and reloads the list", async () => {
    apiMock.myReceiver.mockResolvedValue(receiver());
    apiMock.myReceiverOffers
      .mockResolvedValueOnce([offer()])
      .mockResolvedValueOnce([offer({ status: "accepted" })]);
    apiMock.answerDonationOffer.mockResolvedValue(offer({ status: "accepted" }));
    render(<ReceiverPanel t={messages} locale="en" />);

    fireEvent.click(await screen.findByRole("button", { name: "Accept" }));

    await waitFor(() => expect(apiMock.answerDonationOffer).toHaveBeenCalledWith(9, "accept"));
    expect(await screen.findByText("Accepted")).toBeTruthy();
  });

  it("explains that the stock is gone when accepting fails", async () => {
    apiMock.myReceiver.mockResolvedValue(receiver());
    apiMock.myReceiverOffers.mockResolvedValue([offer()]);
    apiMock.answerDonationOffer.mockRejectedValue(
      new ApiError("conflict", 409, "donation_stock_unavailable"),
    );
    render(<ReceiverPanel t={messages} locale="en" />);

    fireEvent.click(await screen.findByRole("button", { name: "Accept" }));

    expect(await screen.findByText("Those portions are no longer available.")).toBeTruthy();
  });
});
