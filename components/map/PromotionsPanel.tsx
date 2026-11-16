import { fill, formatDateTime } from "@/lib/format";
import { formatCop } from "@/lib/map";
import type { Promotion } from "@/lib/map-schemas";

type Props = { promotions: Promotion[]; t: Record<string, string>; locale: string };

export default function PromotionsPanel({ promotions, t, locale }: Props) {
  return (
    <section
      aria-labelledby="promotions-title"
      className="rounded-3xl border border-ce3e5dc bg-white p-5"
    >
      <h2 id="promotions-title" className="text-lg font-black">
        {t.mapPromotionsTitle}
      </h2>
      <p className="mt-1 text-xs text-c5b6257">{t.mapPromotionsNote}</p>
      {promotions.length === 0 ? (
        <p className="mt-3 text-sm">{t.mapPromotionsEmpty}</p>
      ) : (
        <ul className="mt-3 grid gap-3">
          {promotions.map((promotion) => (
            <li key={promotion.url} className="rounded-2xl border border-ce3e5dc p-3 text-sm">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold">{promotion.name}</span>
                <span className="rounded-full bg-cf5dcec px-2 py-0.5 text-xs font-bold text-c8a2f64">
                  {fill(t.mapPromotionOff, { percent: promotion.discount_percent })}
                </span>
              </div>
              <p className="mt-1">
                <span className="font-black">{formatCop(promotion.price_cop, locale)}</span>
                {promotion.original_price_cop ? (
                  <span className="ml-2 text-c5b6257 line-through">
                    {formatCop(promotion.original_price_cop, locale)}
                  </span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-c5b6257">
                {fill(t.mapPromotionFrom, { source: promotion.source_name })} ·{" "}
                {fill(t.mapPromotionSeen, { date: formatDateTime(promotion.last_seen_at, locale) })}
              </p>
              <a
                href={promotion.url}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="mt-1 inline-block text-xs underline"
              >
                {t.mapPromotionOpen}
              </a>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
