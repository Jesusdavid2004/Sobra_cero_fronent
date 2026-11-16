import type { MapPlacesParams } from "@/lib/api";
import type { Place, PlaceCategory } from "@/lib/map-schemas";

export const PASTO_CENTER: [number, number] = [1.2136, -77.2811];
export const DEFAULT_ZOOM = 13;
export const MAX_ZOOM = 19;
export const USER_ZOOM = 15;

/**
 * The public OpenStreetMap tile server is for light use only. Point NEXT_PUBLIC_MAP_TILE_URL at a
 * hosted provider before real traffic (see docs/MAPS_GUIDE.md); the attribution travels with it.
 */
export const TILE_URL =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ?? "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION =
  process.env.NEXT_PUBLIC_MAP_ATTRIBUTION ?? "© OpenStreetMap contributors";

export const LAYERS = ["affiliated", "discovered", "receivers"] as const;
export type LayerKey = (typeof LAYERS)[number];

export const FILTERABLE_CATEGORIES: PlaceCategory[] = [
  "supermarket",
  "restaurant",
  "bakery",
  "cafe",
  "store",
  "market",
];

export const CATEGORY_STYLE: Record<PlaceCategory, { color: string; glyph: string }> = {
  supermarket: { color: "#2f6b3a", glyph: "🛒" },
  restaurant: { color: "#b5482a", glyph: "🍽" },
  bakery: { color: "#a8741a", glyph: "🥖" },
  cafe: { color: "#6b4a2f", glyph: "☕" },
  store: { color: "#356a8a", glyph: "🏪" },
  market: { color: "#7a4a8a", glyph: "🧺" },
  receiver: { color: "#8a2f64", glyph: "🤝" },
  other: { color: "#5b6257", glyph: "📍" },
};

export type MapFilters = {
  layers: LayerKey[];
  categories: PlaceCategory[];
  text: string;
  onlyWithOffers: boolean;
  showOpportunities: boolean;
  includeDemo: boolean;
};

export const DEFAULT_FILTERS: MapFilters = {
  layers: [...LAYERS],
  categories: [],
  text: "",
  onlyWithOffers: false,
  showOpportunities: false,
  includeDemo: false,
};

function toggle<T>(items: T[], item: T): T[] {
  return items.includes(item) ? items.filter((current) => current !== item) : [...items, item];
}

export function toggleLayer(filters: MapFilters, layer: LayerKey): MapFilters {
  return { ...filters, layers: toggle(filters.layers, layer) };
}

export function toggleCategory(filters: MapFilters, category: PlaceCategory): MapFilters {
  return { ...filters, categories: toggle(filters.categories, category) };
}

export function toQuery(filters: MapFilters): MapPlacesParams {
  return {
    layers: filters.layers,
    categories: filters.categories,
    text: filters.text.trim(),
    onlyWithOffers: filters.onlyWithOffers,
    includeDemo: filters.includeDemo,
  };
}

export function affiliationKey(place: Place): string {
  return `mapAffiliation_${place.affiliation}`;
}

export function categoryKey(category: string): string {
  return `mapCategory_${category}`;
}

/** Corners that contain every place, or null when there is nothing to show. */
export function boundsOf(places: Place[]): [[number, number], [number, number]] | null {
  if (places.length === 0) return null;
  const latitudes = places.map((place) => place.latitude);
  const longitudes = places.map((place) => place.longitude);
  return [
    [Math.min(...latitudes), Math.min(...longitudes)],
    [Math.max(...latitudes), Math.max(...longitudes)],
  ];
}

export function formatCop(value: number, locale: string): string {
  return new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

const MARKER_SIZE = 34;

/**
 * Marker markup. An affiliated place is a solid disc; a discovered one is a hollow dashed ring, so
 * the two can never be mistaken for each other even without reading the legend.
 */
export function markerHtml(place: Place, selected: boolean): string {
  const style = CATEGORY_STYLE[place.category];
  const affiliated = place.affiliation === "affiliated";
  const background = affiliated ? style.color : "rgba(255,255,255,0.92)";
  const border = affiliated ? "3px solid #ffffff" : `3px dashed ${style.color}`;
  const ring = selected ? "0 0 0 4px rgba(48,68,42,0.45)" : "0 2px 6px rgba(0,0,0,0.35)";
  const badge =
    place.offer_count > 0
      ? `<span style="position:absolute;top:-6px;right:-6px;min-width:16px;height:16px;padding:0 4px;border-radius:9999px;background:#d9480f;color:#fff;font:700 10px/16px sans-serif;text-align:center">${place.offer_count}</span>`
      : "";
  return (
    `<div style="position:relative;width:${MARKER_SIZE}px;height:${MARKER_SIZE}px;border-radius:9999px;` +
    `display:flex;align-items:center;justify-content:center;font-size:16px;` +
    `background:${background};border:${border};box-shadow:${ring}">${style.glyph}${badge}</div>`
  );
}

export const MARKER_PIXELS = MARKER_SIZE;
