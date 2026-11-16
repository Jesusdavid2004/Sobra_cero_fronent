import { ApiError } from "@/lib/api";
import type { PricePoint, Source } from "@/lib/scanner-schemas";

export const SCHEDULE_OPTIONS: (number | null)[] = [null, 60, 360, 1440];

export function statusKey(status: string): string {
  return `scannerStatus_${status}`;
}

export function stopReasonKey(reason: string): string {
  return `scannerStop_${reason}`;
}

export function canRun(source: Source): boolean {
  return source.enabled && source.terms_reviewed;
}

export function scheduleKey(minutes: number | null): string {
  return minutes === null ? "scannerScheduleOff" : `scannerSchedule_${minutes}`;
}

/** Translation key for a refusal reason such as `terms_not_reviewed` or `url_rejected:not_https`. */
export function refusalKey(reason: string): string {
  if (reason.startsWith("url_rejected:")) return `scannerUrl_${reason.split(":")[1]}`;
  return `scannerRefusal_${reason}`;
}

/** The message to show for a failed Scanner request, in the visitor's language. */
export function scannerErrorMessage(t: Record<string, string>, cause: unknown): string {
  if (!(cause instanceof ApiError)) return t.scannerErrorGeneric;
  if (cause.code === "scanner_permission_denied") return t.scannerErrorForbidden;
  if (cause.code === "scanner_source_not_found") return t.scannerErrorNotFound;
  if (cause.reason) {
    const prefix =
      cause.code === "scanner_url_rejected"
        ? "scannerUrl_"
        : cause.code === "scanner_source_invalid"
          ? "scannerInvalid_"
          : "scannerRefusal_";
    return t[`${prefix}${cause.reason}`] ?? t.scannerErrorGeneric;
  }
  return t.scannerErrorGeneric;
}

/** Points of a small line chart: oldest on the left, cheapest at the bottom. */
export function sparkline(points: PricePoint[], width: number, height: number): string {
  if (points.length === 0) return "";
  const prices = points.map((point) => point.price_cop);
  const low = Math.min(...prices);
  const span = Math.max(...prices) - low || 1;
  const step = points.length > 1 ? width / (points.length - 1) : 0;
  return points
    .map((point, index) => {
      const x = points.length > 1 ? index * step : width / 2;
      const y = height - ((point.price_cop - low) / span) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
}
