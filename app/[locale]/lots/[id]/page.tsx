import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";

import LotDetailView from "@/components/LotDetailView";
import {
  fetchLot,
  fetchLotPromotions,
  PublicApiError,
  type PublicLot,
  type PublicPromotion,
} from "@/lib/server-api";

/**
 * SSR: the lot (stock, price, expiry) is read on every request and rendered into the HTML.
 * The reservation itself is re-validated by the API transaction, never by this page.
 */
export const dynamic = "force-dynamic";

type RouteParams = Readonly<{ params: Promise<{ locale: string; id: string }> }>;

async function loadLot(rawId: string): Promise<PublicLot | null> {
  const lotId = Number(rawId);
  if (!Number.isInteger(lotId) || lotId <= 0) notFound();
  try {
    return await fetchLot(lotId);
  } catch (cause) {
    if (cause instanceof PublicApiError && cause.status === 404) notFound();
    return null;
  }
}

async function loadPromotions(lotId: number): Promise<PublicPromotion[]> {
  try {
    return await fetchLotPromotions(lotId);
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: RouteParams): Promise<Metadata> {
  const { id } = await params;
  const lot = await loadLot(id);
  return { title: lot ? `${lot.title} · SobraCero` : "SobraCero", description: lot?.description };
}

export default async function LotDetailPage({ params }: RouteParams) {
  const { locale, id } = await params;
  setRequestLocale(locale);
  const lot = await loadLot(id);
  const promotions = lot ? await loadPromotions(lot.id) : [];

  return <LotDetailView lotId={Number(id)} initialLot={lot} initialPromos={promotions} />;
}
