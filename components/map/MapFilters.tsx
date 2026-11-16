import {
  FILTERABLE_CATEGORIES,
  LAYERS,
  toggleCategory,
  toggleLayer,
  type MapFilters as Filters,
} from "@/lib/map";

type Props = {
  filters: Filters;
  t: Record<string, string>;
  onChange: (filters: Filters) => void;
};

const FIELD = "w-full rounded-xl border border-cdfe4da bg-cfbfcf9 px-4 py-3 text-sm";

export default function MapFilters({ filters, t, onChange }: Props) {
  return (
    <div className="grid gap-4">
      <label className="text-sm font-semibold">
        <span className="mb-1 block">{t.mapSearchLabel}</span>
        <input
          type="search"
          value={filters.text}
          placeholder={t.mapSearchPlaceholder}
          onChange={(event) => onChange({ ...filters, text: event.target.value })}
          className={FIELD}
        />
      </label>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">{t.mapLayers}</legend>
        <div className="grid gap-1">
          {LAYERS.map((layer) => (
            <label key={layer} className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={filters.layers.includes(layer)}
                onChange={() => onChange(toggleLayer(filters, layer))}
              />
              {t[`mapLayer_${layer}`]}
            </label>
          ))}
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.onlyWithOffers}
              onChange={(event) => onChange({ ...filters, onlyWithOffers: event.target.checked })}
            />
            {t.mapOnlyOffers}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.showOpportunities}
              onChange={(event) =>
                onChange({ ...filters, showOpportunities: event.target.checked })
              }
            />
            {t.mapShowOpportunities}
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={filters.includeDemo}
              onChange={(event) => onChange({ ...filters, includeDemo: event.target.checked })}
            />
            {t.mapIncludeDemo}
          </label>
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-1 text-sm font-semibold">{t.mapCategories}</legend>
        <div className="flex flex-wrap gap-2">
          {FILTERABLE_CATEGORIES.map((category) => {
            const active = filters.categories.includes(category);
            return (
              <button
                key={category}
                type="button"
                aria-pressed={active}
                onClick={() => onChange(toggleCategory(filters, category))}
                className={`rounded-full border px-3 py-1 text-sm ${
                  active ? "border-c30442a bg-c30442a text-white" : "bg-white"
                }`}
              >
                {t[`mapCategory_${category}`]}
              </button>
            );
          })}
        </div>
      </fieldset>

      <section aria-label={t.mapLegendTitle} className="rounded-2xl bg-cf0f3ec px-4 py-3 text-xs">
        <p className="mb-1 font-bold">{t.mapLegendTitle}</p>
        <ul className="grid gap-1">
          <li>{t.mapLegendAffiliated}</li>
          <li>{t.mapLegendDiscovered}</li>
          <li>{t.mapLegendOffers}</li>
        </ul>
      </section>
    </div>
  );
}
