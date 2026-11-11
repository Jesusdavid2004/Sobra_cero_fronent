import { Link } from "@/i18n/navigation";
import type { PublicLot } from "@/lib/server-api";

type Props = {
  lot: PublicLot;
  labels: Record<"discount" | "available" | "category" | "business" | "view", string>;
  currency: Intl.NumberFormat;
};

export default function LotCard({ lot, labels, currency }: Props) {
  const currentPrice = (lot.original_price_cents * (100 - lot.discount_percent)) / 100;

  return (
    <article className="overflow-hidden rounded-[26px] border border-ce3e5dc bg-white shadow-[0_12px_30px_rgba(42,55,32,0.08)]">
      {lot.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={lot.image_url} alt={lot.title} className="h-52 w-full object-cover" />
      ) : (
        <div
          aria-hidden="true"
          className="flex h-52 items-center justify-center bg-ceaf2df text-6xl"
        >
          🥬
        </div>
      )}
      <div className="p-5">
        <div className="flex items-center justify-between gap-3">
          <span className="rounded-full bg-ceaf4dd px-3 py-1 text-sm font-bold text-c426431">
            {lot.discount_percent}% {labels.discount}
          </span>
          <span className="text-sm text-stone-600">
            {lot.quantity} {labels.available}
          </span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2 text-xs font-semibold text-c627158">
          <span className="rounded-full bg-cf3f5ef px-3 py-1">{labels.category}</span>
          <span className="rounded-full bg-cf3f5ef px-3 py-1">{labels.business}</span>
        </div>
        <h2 className="mt-4 text-xl font-black">{lot.title}</h2>
        <p className="mt-2 min-h-10 text-sm text-stone-600">{lot.description}</p>
        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-2xl font-black text-c426431">
            {currency.format(currentPrice / 100)}
          </span>
          <span className="text-sm text-stone-400 line-through">
            {currency.format(lot.original_price_cents / 100)}
          </span>
        </div>
        <Link
          href={`/lots/${lot.id}`}
          className="mt-5 block rounded-xl bg-c33452b px-4 py-3 text-center font-bold text-white transition hover:bg-c263820"
        >
          {labels.view}
        </Link>
      </div>
    </article>
  );
}
