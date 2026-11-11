import { getTranslations, setRequestLocale } from "next-intl/server";
import { Suspense } from "react";

import Header from "@/components/Header";
import { LiveIndicator, LiveStockProvider } from "@/components/live/LiveStock";
import LotCard from "@/components/market/LotCard";
import { fetchLotPromotions, fetchLots } from "@/lib/server-api";

/**
 * Streaming SSR: the shell (header, hero, filters) is sent immediately; the lot list and the
 * promotion highlights each sit behind their own Suspense boundary and arrive as they resolve.
 * Filters are a plain GET form, so they work without client JavaScript.
 */
export const dynamic = "force-dynamic";

const CATEGORIES = ["produce", "bakery", "dairy", "meat", "prepared", "pantry", "other"] as const;
const BUSINESS_TYPES = ["restaurant", "supermarket"] as const;
const HIGHLIGHT_LOT_COUNT = 3;
const SKELETON_CARD_COUNT = 3;

type Translate = Awaited<ReturnType<typeof getTranslations>>;
type SearchParams = Promise<{ category?: string; business_type?: string }>;

function pick<T extends string>(value: string | undefined, allowed: readonly T[]): T | "" {
  return allowed.find((candidate) => candidate === value) ?? "";
}

function categoryLabel(t: Translate, category: string) {
  return t(`category${category.charAt(0).toUpperCase()}${category.slice(1)}`);
}

export default async function MarketPage({
  params,
  searchParams,
}: Readonly<{ params: Promise<{ locale: string }>; searchParams: SearchParams }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const query = await searchParams;
  const category = pick(query.category, CATEGORIES);
  const businessType = pick(query.business_type, BUSINESS_TYPES);
  const t = await getTranslations({ locale });
  const suspenseKey = `${category}|${businessType}`;

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <div className="mb-8 rounded-[28px] bg-cbfe09a px-6 py-8 shadow-[0_7px_0_#3b422c] md:px-10">
          <p className="text-sm font-bold uppercase tracking-[0.18em] text-c49633b">
            {t("marketEyebrow")}
          </p>
          <h1 className="mt-2 text-3xl font-black md:text-5xl">{t("marketTitle")}</h1>
          <p className="mt-3 max-w-2xl text-c34442d">{t("marketDescription")}</p>
        </div>

        <form
          method="get"
          className="mb-6 grid gap-3 rounded-2xl border border-ce3e5dc bg-white p-4 sm:grid-cols-[1fr_1fr_auto]"
        >
          <label className="text-sm font-bold">
            <span className="mb-2 block text-stone-600">{t("filterBusinesses")}</span>
            <select
              name="business_type"
              defaultValue={businessType}
              className="w-full rounded-xl border border-cdfe4da bg-cfbfcf9 px-4 py-3"
            >
              <option value="">{t("filterAllBusinesses")}</option>
              {BUSINESS_TYPES.map((type) => (
                <option key={type} value={type}>
                  {t(type)}
                </option>
              ))}
            </select>
          </label>
          <label className="text-sm font-bold">
            <span className="mb-2 block text-stone-600">{t("filterCategories")}</span>
            <select
              name="category"
              defaultValue={category}
              className="w-full rounded-xl border border-cdfe4da bg-cfbfcf9 px-4 py-3"
            >
              <option value="">{t("filterAllCategories")}</option>
              {CATEGORIES.map((item) => (
                <option key={item} value={item}>
                  {categoryLabel(t, item)}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            className="self-end rounded-xl bg-c30442a px-6 py-3 font-bold text-white hover:bg-c253820"
          >
            {t("marketApplyFilters")}
          </button>
        </form>

        <Suspense key={`highlights-${suspenseKey}`} fallback={<HighlightsSkeleton t={t} />}>
          <PromotionHighlights locale={locale} category={category} businessType={businessType} />
        </Suspense>

        <Suspense key={`lots-${suspenseKey}`} fallback={<LotsSkeleton t={t} />}>
          <LotsGrid locale={locale} category={category} businessType={businessType} />
        </Suspense>
      </section>
    </main>
  );
}

type SectionProps = { locale: string; category: string; businessType: string };

async function LotsGrid({ locale, category, businessType }: SectionProps) {
  const t = await getTranslations({ locale });
  let lots;
  try {
    lots = await fetchLots(category, businessType);
  } catch {
    return (
      <p role="alert" className="rounded-2xl bg-red-50 px-5 py-4 text-red-700">
        {t("marketLoadError")}
      </p>
    );
  }
  if (lots.length === 0) {
    return (
      <div className="rounded-2xl border border-cd9dfce bg-white/80 px-5 py-8 text-center">
        <p className="text-lg font-bold">
          {category || businessType ? t("filterNoResults") : t("empty")}
        </p>
        <p className="mt-2 text-stone-600">{t("marketEmptyDescription")}</p>
      </div>
    );
  }
  const currency = new Intl.NumberFormat(locale === "es" ? "es-CO" : "en-US", {
    style: "currency",
    currency: "USD",
  });
  return (
    <LiveStockProvider lotIds={lots.map((lot) => lot.id)}>
      <LiveIndicator
        labels={{
          live: t("liveStatusLive"),
          connecting: t("liveStatusConnecting"),
          offline: t("liveStatusOffline"),
        }}
      />
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {lots.map((lot) => (
          <LotCard
            key={lot.id}
            lot={lot}
            currency={currency}
            labels={{
              discount: t("discount"),
              available: t("available"),
              soldOut: t("liveSoldOut"),
              category: categoryLabel(t, lot.category),
              business: t(lot.business_type),
              view: t("viewAndReserve"),
            }}
          />
        ))}
      </div>
    </LiveStockProvider>
  );
}

/** Secondary block: one extra request per lot, so it streams in after the shell. */
async function PromotionHighlights({ locale, category, businessType }: SectionProps) {
  const t = await getTranslations({ locale });
  try {
    const lots = (await fetchLots(category, businessType)).slice(0, HIGHLIGHT_LOT_COUNT);
    const promotions = await Promise.all(
      lots.map(async (lot) => ({ lot, promos: await fetchLotPromotions(lot.id) })),
    );
    const highlights = promotions.flatMap(({ lot, promos }) => {
      const promo = promos.find((item) => item.language === locale) ?? promos[0];
      return promo ? [{ lot, text: promo.text }] : [];
    });
    if (highlights.length === 0) return null;
    return (
      <section aria-labelledby="highlights-title" className="mb-8">
        <h2 id="highlights-title" className="mb-3 text-lg font-black">
          {t("marketHighlights")}
        </h2>
        <ul className="grid gap-3 md:grid-cols-3">
          {highlights.map(({ lot, text }) => (
            <li
              key={lot.id}
              className="rounded-2xl bg-ceef5e1 p-4 text-sm italic leading-6 text-c34442d"
            >
              <span className="block text-xs font-bold not-italic uppercase text-c66804f">
                {lot.title}
              </span>
              “{text}”
            </li>
          ))}
        </ul>
      </section>
    );
  } catch {
    return null;
  }
}

function HighlightsSkeleton({ t }: { t: Translate }) {
  return (
    <div className="mb-8 h-24 animate-pulse rounded-2xl bg-ceef5e1" role="status">
      <span className="sr-only">{t("marketHighlightsLoading")}</span>
    </div>
  );
}

function LotsSkeleton({ t }: { t: Translate }) {
  return (
    <div
      role="status"
      className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3"
      aria-label={t("marketLoading")}
    >
      {Array.from({ length: SKELETON_CARD_COUNT }, (_, index) => (
        <div key={index} className="h-96 animate-pulse rounded-[26px] bg-white/70" />
      ))}
    </div>
  );
}
