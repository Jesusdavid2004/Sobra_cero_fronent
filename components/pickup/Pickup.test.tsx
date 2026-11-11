import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import en from "@/i18n/en.json";
import { encodePickupPayload } from "@/lib/pickup-qr";

import PickupQr from "./PickupQr";
import PickupScanner from "./PickupScanner";

const messages = en as Record<string, string>;

type WindowWithDetector = { BarcodeDetector?: unknown };

function installDetector(detect: () => Promise<{ rawValue: string }[]>) {
  (window as unknown as WindowWithDetector).BarcodeDetector = class {
    detect = detect;
  };
}

describe("PickupQr", () => {
  afterEach(cleanup);

  it("draws a labelled QR image without exposing the code as text", () => {
    render(<PickupQr reservationId={7} pickupCode="0A0B0C0D" label="QR code for reservation 7" />);

    const image = screen.getByRole("img", { name: "QR code for reservation 7" });

    expect(image.querySelector("path")?.getAttribute("d")?.length).toBeGreaterThan(100);
    expect(image.textContent).not.toContain("0A0B0C0D");
  });
});

describe("PickupScanner", () => {
  const stopTrack = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    HTMLMediaElement.prototype.play = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "mediaDevices", {
      configurable: true,
      value: {
        getUserMedia: vi.fn().mockResolvedValue({ getTracks: () => [{ stop: stopTrack }] }),
      },
    });
  });
  afterEach(() => {
    cleanup();
    delete (window as unknown as WindowWithDetector).BarcodeDetector;
  });

  it("tells the shop owner to type the code when the browser cannot scan", () => {
    render(<PickupScanner t={messages} onScan={vi.fn()} />);

    expect(screen.getByText(messages.pickupScanUnsupported)).toBeTruthy();
  });

  it("hands over the credential found in a scanned QR and stops the camera", async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: encodePickupPayload(42, "a1b2c3d4") }]);
    installDetector(detect);
    const onScan = vi.fn();
    render(<PickupScanner t={messages} onScan={onScan} />);

    fireEvent.click(await screen.findByRole("button", { name: messages.pickupScanButton }));

    await waitFor(() =>
      expect(onScan).toHaveBeenCalledWith({ reservationId: 42, pickupCode: "A1B2C3D4" }),
    );
    await waitFor(() => expect(stopTrack).toHaveBeenCalled());
  });

  it("ignores a QR that is not a SobraCero pickup code", async () => {
    const detect = vi.fn().mockResolvedValue([{ rawValue: "https://example.com/pay" }]);
    installDetector(detect);
    const onScan = vi.fn();
    render(<PickupScanner t={messages} onScan={onScan} />);

    fireEvent.click(await screen.findByRole("button", { name: messages.pickupScanButton }));

    expect(await screen.findByText(messages.pickupScanInvalid)).toBeTruthy();
    expect(onScan).not.toHaveBeenCalled();
  });
});
