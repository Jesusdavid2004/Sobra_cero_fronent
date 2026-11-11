import type { DiscoveryIntent } from "@/lib/api";

/** Demo area used until the customer shares a position; it is shown to them as an assumption. */
export const DEFAULT_LOCATION = { latitude: 4.7, longitude: -74.0 } as const;
export const DEFAULT_RADIUS_KM = 10;
export const MAX_RADIUS_KM = 50;
export const DEFAULT_WINDOW_HOURS = 3;
export const DISCOVERY_CATEGORIES = [
  "produce",
  "bakery",
  "dairy",
  "meat",
  "prepared",
  "pantry",
  "other",
] as const;

const CLOCK_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;
const CENTS_PER_UNIT = 100;
const MS_PER_HOUR = 3_600_000;

export type DiscoveryForm = {
  budget: string;
  from: string;
  until: string;
  quantity: string;
  category: string;
};

export const EMPTY_FORM: DiscoveryForm = {
  budget: "",
  from: "",
  until: "",
  quantity: "1",
  category: "",
};

/** Turns an HH:MM clock time into a Date on the same local day as `base`. */
export function clockToDate(clock: string, base: Date): Date | null {
  const match = CLOCK_PATTERN.exec(clock);
  if (!match) return null;
  const date = new Date(base);
  date.setHours(Number(match[1]), Number(match[2]), 0, 0);
  return date;
}

export function resolveWindow(
  from: string,
  until: string,
  now: Date,
): { start: Date; end: Date } | null {
  const start = from ? clockToDate(from, now) : now;
  if (!start) return null;
  const end = until
    ? clockToDate(until, now)
    : new Date(start.getTime() + DEFAULT_WINDOW_HOURS * MS_PER_HOUR);
  if (!end || end.getTime() <= start.getTime()) return null;
  return { start, end };
}

export function toBudgetCents(value: string): number | undefined {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount) || amount < 0) return undefined;
  return Math.round(amount * CENTS_PER_UNIT);
}

/** Copies only the values the model actually found; the customer reviews them before searching. */
export function applyIntent(current: DiscoveryForm, intent: DiscoveryIntent): DiscoveryForm {
  return {
    budget: intent.budget === null ? current.budget : String(intent.budget),
    from: intent.pickup_from ?? current.from,
    until: intent.pickup_until ?? current.until,
    quantity: intent.quantity === null ? current.quantity : String(intent.quantity),
    category:
      intent.category !== null &&
      (DISCOVERY_CATEGORIES as readonly string[]).includes(intent.category)
        ? intent.category
        : current.category,
  };
}

export function intentFoundNothing(intent: DiscoveryIntent): boolean {
  return Object.values(intent).every((value) => value === null);
}
