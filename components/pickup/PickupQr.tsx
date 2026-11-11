import QRCode from "qrcode";

import { encodePickupPayload } from "@/lib/pickup-qr";

type Props = { reservationId: number; pickupCode: string; label: string };

const QUIET_ZONE_MODULES = 2;
const ERROR_CORRECTION = "M";

/** Draws the QR as SVG paths (no HTML injection). Colors are fixed so it scans in dark mode too. */
export default function PickupQr({ reservationId, pickupCode, label }: Props) {
  const qr = QRCode.create(encodePickupPayload(reservationId, pickupCode), {
    errorCorrectionLevel: ERROR_CORRECTION,
  });
  const size = qr.modules.size;
  const total = size + QUIET_ZONE_MODULES * 2;
  const cells: string[] = [];
  for (let row = 0; row < size; row += 1) {
    for (let column = 0; column < size; column += 1) {
      if (qr.modules.get(row, column)) {
        cells.push(`M${column + QUIET_ZONE_MODULES} ${row + QUIET_ZONE_MODULES}h1v1h-1z`);
      }
    }
  }

  return (
    <svg
      role="img"
      aria-label={label}
      viewBox={`0 0 ${total} ${total}`}
      shapeRendering="crispEdges"
      className="h-44 w-44 rounded-xl"
    >
      <rect width={total} height={total} fill="#ffffff" />
      <path d={cells.join("")} fill="#000000" />
    </svg>
  );
}
