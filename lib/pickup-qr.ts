/**
 * The pickup QR carries the reservation reference and its one-time code. It is only a way to
 * type them faster: the server still checks that the signed-in shop owns the lot and that the
 * reservation has not been picked up yet, so scanning twice changes nothing.
 */
const PAYLOAD_PREFIX = "sobracero:pickup:v1";
const PAYLOAD_PATTERN = /^sobracero:pickup:v1:(\d{1,9}):([A-Fa-f0-9]{8})$/;

export type PickupCredential = { reservationId: number; pickupCode: string };

export function encodePickupPayload(reservationId: number, pickupCode: string): string {
  return `${PAYLOAD_PREFIX}:${reservationId}:${pickupCode.toUpperCase()}`;
}

/** Returns null for anything that is not exactly a SobraCero pickup payload. */
export function parsePickupPayload(raw: string): PickupCredential | null {
  const match = PAYLOAD_PATTERN.exec(raw.trim());
  if (!match) return null;
  const reservationId = Number(match[1]);
  if (!Number.isSafeInteger(reservationId) || reservationId <= 0) return null;
  return { reservationId, pickupCode: match[2].toUpperCase() };
}
