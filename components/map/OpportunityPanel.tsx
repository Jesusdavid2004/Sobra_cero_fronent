import { fill } from "@/lib/format";
import type { OpportunityCell } from "@/lib/map-schemas";

type Props = {
  cells: OpportunityCell[];
  t: Record<string, string>;
  onFocus: (cell: OpportunityCell) => void;
};

const MAX_SHOWN = 8;

export default function OpportunityPanel({ cells, t, onFocus }: Props) {
  const shown = cells.slice(0, MAX_SHOWN);

  return (
    <section
      aria-labelledby="opportunities-title"
      className="rounded-3xl border border-ce3e5dc bg-white p-5"
    >
      <h2 id="opportunities-title" className="text-lg font-black">
        {t.mapOpportunitiesTitle}
      </h2>
      <p className="mt-1 text-xs text-c5b6257">{t.mapOpportunitiesNote}</p>
      {shown.length === 0 ? (
        <p className="mt-3 text-sm">{t.mapOpportunitiesEmpty}</p>
      ) : (
        <ul className="mt-3 grid gap-2">
          {shown.map((cell) => (
            <li key={`${cell.south},${cell.west}`}>
              <button
                type="button"
                onClick={() => onFocus(cell)}
                className="w-full rounded-2xl border border-ce3e5dc p-3 text-left text-sm hover:bg-cf3f5ef"
              >
                <span className="block">
                  {fill(t.mapOpportunityCell, {
                    shops: cell.affiliated_shops,
                    offers: cell.live_offers,
                    receivers: cell.receivers,
                    found: cell.discovered_businesses,
                  })}
                </span>
                {cell.somewhere_to_invite ? (
                  <span className="mt-1 block text-xs font-bold text-c8a2f64">
                    {t.mapOpportunityInvite}
                  </span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
