import { describe, expect, it } from "vitest";

import { encodePickupPayload, parsePickupPayload } from "./pickup-qr";

describe("pickup QR payload", () => {
  it("round-trips a reservation reference and code", () => {
    const payload = encodePickupPayload(42, "a1b2c3d4");

    expect(parsePickupPayload(payload)).toEqual({ reservationId: 42, pickupCode: "A1B2C3D4" });
  });

  it("tolerates surrounding whitespace from a scanner", () => {
    expect(parsePickupPayload("  sobracero:pickup:v1:7:0A0B0C0D\n")).toEqual({
      reservationId: 7,
      pickupCode: "0A0B0C0D",
    });
  });

  it.each([
    ["an unrelated QR", "https://example.com/pay?to=someone"],
    ["a short code", "sobracero:pickup:v1:7:ABC"],
    ["a non-hex code", "sobracero:pickup:v1:7:ZZZZZZZZ"],
    ["a zero reference", "sobracero:pickup:v1:0:0A0B0C0D"],
    ["extra trailing data", "sobracero:pickup:v1:7:0A0B0C0D:extra"],
    ["another version", "sobracero:pickup:v2:7:0A0B0C0D"],
  ])("rejects %s", (_label, raw) => {
    expect(parsePickupPayload(raw)).toBeNull();
  });
});
