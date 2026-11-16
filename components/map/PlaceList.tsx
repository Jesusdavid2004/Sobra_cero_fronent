import { fill } from "@/lib/format";
import { affiliationKey, categoryKey, CATEGORY_STYLE } from "@/lib/map";
import type { Place } from "@/lib/map-schemas";

type Props = {
  places: Place[];
  selectedId: string | null;
  t: Record<string, string>;
  onSelect: (place: Place) => void;
};

export default function PlaceList({ places, selectedId, t, onSelect }: Props) {
  if (places.length === 0) {
    return <p className="rounded-2xl bg-cf0f3ec px-4 py-3 text-sm">{t.mapNoResults}</p>;
  }

  return (
    <div>
      <p className="mb-2 text-sm font-semibold" aria-live="polite">
        {fill(t.mapResultsCount, { count: places.length })}
      </p>
      <ul aria-label={t.mapListLabel} className="grid max-h-[28rem] gap-2 overflow-y-auto pr-1">
        {places.map((place) => {
          const selected = place.place_id === selectedId;
          return (
            <li key={place.place_id}>
              <button
                type="button"
                aria-pressed={selected}
                aria-label={fill(t.mapSelectPlace, { name: place.name })}
                onClick={() => onSelect(place)}
                className={`flex w-full items-start gap-3 rounded-2xl border p-3 text-left transition ${
                  selected
                    ? "border-c30442a bg-cf0f3ec"
                    : "border-ce3e5dc bg-white hover:bg-cf3f5ef"
                }`}
              >
                <span aria-hidden="true" className="text-xl">
                  {CATEGORY_STYLE[place.category].glyph}
                </span>
                <span className="min-w-0">
                  <span className="block truncate font-bold">{place.name}</span>
                  <span className="block text-xs text-c5b6257">
                    {t[categoryKey(place.category)]} · {t[affiliationKey(place)]}
                  </span>
                  {place.offer_count > 0 ? (
                    <span className="mt-1 inline-block rounded-full bg-cf5dcec px-2 py-0.5 text-xs font-bold text-c8a2f64">
                      {fill(t.mapCardOffers, { count: place.offer_count })}
                    </span>
                  ) : null}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
