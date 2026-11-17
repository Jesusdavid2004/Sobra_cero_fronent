import type { Metadata } from "next";
import { headers } from "next/headers";
import { getTranslations, setRequestLocale } from "next-intl/server";

import Header from "@/components/Header";
import { DEMO_PRODUCTS, demoCatalogJsonLd, serializeJsonLd } from "@/lib/demo-catalog";
import { formatCop } from "@/lib/map";

/**
 * Server-rendered because the product addresses use the host the page is requested on. It is not
 * indexed: it exists only so the Scanner can be shown end to end without reading anyone else's site.
 */
export const dynamic = "force-dynamic";
export const metadata: Metadata = { robots: { index: false, follow: false } };

type RouteParams = Readonly<{ params: Promise<{ locale: string }> }>;

export default async function DemoCatalogPage({ params }: RouteParams) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });
  const requestHeaders = await headers();
  const host = requestHeaders.get("x-forwarded-host") ?? requestHeaders.get("host") ?? "localhost";
  const protocol = requestHeaders.get("x-forwarded-proto") ?? "https";
  const jsonLd = serializeJsonLd(demoCatalogJsonLd(`${protocol}://${host}/${locale}`));

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-3xl px-6 pb-16 pt-8">
        <h1 className="text-4xl font-black">{t("demoCatalogTitle")}</h1>
        <p className="mt-3 rounded-2xl bg-cf5dcec px-4 py-3 text-sm text-c8a2f64">
          {t("demoCatalogNote")}
        </p>
        <ul className="mt-6 grid gap-3">
          {DEMO_PRODUCTS.map((product) => (
            <li
              key={product.slug}
              id={product.slug}
              className="rounded-2xl border border-ce3e5dc bg-white p-4"
            >
              <p className="font-bold">{product.name}</p>
              <p className="text-xs text-c5b6257">{product.category}</p>
              <p className="mt-1">
                <span className="font-black">{formatCop(product.priceCop, locale)}</span>
                {product.listPriceCop ? (
                  <span className="ml-2 text-c5b6257 line-through">
                    {formatCop(product.listPriceCop, locale)}
                  </span>
                ) : null}
              </p>
            </li>
          ))}
        </ul>
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd }} />
      </section>
    </main>
  );
}
