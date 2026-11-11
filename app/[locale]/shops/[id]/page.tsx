import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import Header from "@/components/Header";
import { Link } from "@/i18n/navigation";
import { fetchPublicShop, PublicApiError, type PublicShop } from "@/lib/server-api";

/**
 * ISR: the profile of a shop is public and changes rarely, so it is generated on the first
 * request and regenerated in the background at most once per window. Stock is never shown here;
 * it is read live on the lot page. No parameter is prerendered at build time.
 */
// Next.js only accepts a literal here; keep it equal to SHOP_PROFILE_REVALIDATE_SECONDS.
export const revalidate = 60;

export function generateStaticParams() {
  return [];
}

type RouteParams = Readonly<{ params: Promise<{ locale: string; id: string }> }>;

async function loadShop(rawId: string): Promise<PublicShop> {
  const shopId = Number(rawId);
  if (!Number.isInteger(shopId) || shopId <= 0) notFound();
  try {
    return await fetchPublicShop(shopId);
  } catch (cause) {
    if (cause instanceof PublicApiError && cause.status === 404) notFound();
    throw cause;
  }
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { id } = await params;
  const shop = await loadShop(id);
  return { title: `${shop.name} · SobraCero`, description: shop.description };
}

export default async function ShopProfilePage({ params }: RouteParams) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const [shop, t] = await Promise.all([loadShop(id), getTranslations({ locale })]);
  const generatedAt = new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
    dateStyle: "medium",
    timeStyle: "medium",
  }).format(new Date());

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-c66804f">
          {t("shopProfileEyebrow")}
        </p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">{shop.name}</h1>
        <p className="mt-3 inline-block rounded-full bg-cf3f5ef px-3 py-1 text-sm font-bold text-c627158">
          {t(shop.business_type)}
        </p>
        {shop.description ? (
          <p className="mt-6 text-lg leading-8 text-c465044">{shop.description}</p>
        ) : null}

        <Link
          href={`/market?business_type=${shop.business_type}`}
          className="mt-8 inline-block rounded-full bg-c30442a px-7 py-4 font-bold text-white shadow-[0_5px_0_#1e2d1a] transition hover:-translate-y-0.5 hover:bg-c253820"
        >
          {t("shopProfileLots")}
        </Link>

        <p className="mt-10 rounded-2xl bg-cf0f3ec px-4 py-3 text-xs text-c5b6257">
          {t("shopProfileGenerated").replace("{time}", generatedAt)}
        </p>
      </section>
    </main>
  );
}
