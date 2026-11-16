import { Link } from "@/i18n/navigation";
import { fill, formatDateTime } from "@/lib/format";
import { affiliationKey, categoryKey } from "@/lib/map";
import type { Place } from "@/lib/map-schemas";

type Props = {
  place: Place;
  attribution: string;
  t: Record<string, string>;
  locale: string;
  onClose: () => void;
};

const BADGE = "rounded-full px-3 py-1 text-xs font-bold";

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[6rem_1fr] gap-2 text-sm">
      <dt className="font-semibold text-c5b6257">{label}</dt>
      <dd className="break-words">{children}</dd>
    </div>
  );
}

export default function PlaceCard({ place, attribution, t, locale, onClose }: Props) {
  const affiliated = place.affiliation === "affiliated";
  const source = place.source === "sobracero" ? t.mapCardSourceSobracero : place.source;

  return (
    <article
      aria-labelledby="place-card-title"
      className="rounded-3xl border border-ce3e5dc bg-white p-5 shadow-[0_12px_30px_rgba(42,55,32,0.08)]"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 id="place-card-title" className="text-xl font-black">
            {place.name}
          </h2>
          <p className="text-sm text-c5b6257">{t[categoryKey(place.category)]}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={t.mapCardClose}
          className="rounded-full border px-3 py-1 text-sm"
        >
          ✕
        </button>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        <span
          className={`${BADGE} ${affiliated ? "bg-c30442a text-white" : "border border-dashed border-c627158 bg-cf3f5ef text-c465044"}`}
        >
          {t[affiliationKey(place)]}
        </span>
        <span
          className={`${BADGE} ${place.verified ? "bg-ceaf4dd text-c426431" : "bg-cf3f5ef text-c5b6257"}`}
        >
          {place.verified ? t.mapCardVerified : t.mapCardUnverified}
        </span>
        {place.is_demo ? (
          <span className={`${BADGE} bg-cf5dcec text-c8a2f64`}>{t.mapCardDemo}</span>
        ) : null}
      </div>

      <dl className="mt-4 grid gap-2">
        <Row label={t.mapCardAddress}>{place.address || t.mapCardNoAddress}</Row>
        <Row label={t.mapCardHours}>{place.opening_hours || t.mapCardNoHours}</Row>
        {place.website ? (
          <Row label={t.mapCardWebsite}>
            <a
              href={place.website}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline"
            >
              {place.website}
            </a>
          </Row>
        ) : null}
        <Row label={t.mapCardLocation}>
          {place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}
        </Row>
        <Row label={t.mapCardSource}>
          {place.source_url ? (
            <a
              href={place.source_url}
              target="_blank"
              rel="noopener noreferrer nofollow"
              className="underline"
              aria-label={`${t.mapCardOpenSource}: ${source}`}
            >
              {source}
            </a>
          ) : (
            source
          )}
        </Row>
      </dl>

      <p className="mt-3 text-sm">
        {place.last_seen_at
          ? fill(t.mapCardUpdated, { date: formatDateTime(place.last_seen_at, locale) })
          : t.mapCardNotDated}
      </p>
      {place.freshness === "stale" ? (
        <p role="note" className="mt-2 rounded-xl bg-cf5dcec px-3 py-2 text-sm text-c8a2f64">
          {t.mapCardStale}
        </p>
      ) : null}

      {affiliated ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <p className="text-sm font-semibold">
            {place.offer_count > 0
              ? fill(t.mapCardOffers, { count: place.offer_count })
              : t.mapCardNoOffers}
          </p>
          {place.offer_count > 0 ? (
            <Link
              href="/market"
              className="rounded-xl bg-c33452b px-4 py-2 text-sm font-bold text-white transition hover:bg-c263820"
            >
              {t.mapCardViewOffers}
            </Link>
          ) : null}
        </div>
      ) : null}

      {attribution && place.source !== "sobracero" ? (
        <p className="mt-4 text-xs text-c5b6257">{fill(t.mapCardAttribution, { attribution })}</p>
      ) : null}
    </article>
  );
}
