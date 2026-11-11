"use client";

import { Link, useRouter } from "@/i18n/navigation";
import { useEffect, useRef, useState } from "react";

import Header from "@/components/Header";
import ExpiryScanPanel from "@/components/ExpiryScanPanel";
import PickupQr from "@/components/pickup/PickupQr";
import { useLotStream } from "@/components/live/useLotStream";
import { ApiError, api, type Lot, type Promotion } from "@/lib/api";
import { useApp } from "@/providers/AppProviders";

type Props = {
  lotId: number;
  initialLot: Lot | null;
  initialPromos: Promotion[];
};

/** Interactive part of the lot page. The server renders the first paint with `initialLot`. */
export default function LotDetailView({ lotId, initialLot, initialPromos }: Props) {
  const { t, token, authReady, lang, user } = useApp();
  const router = useRouter();
  const [lot, setLot] = useState<Lot | null>(initialLot);
  const [promos, setPromos] = useState<Promotion[]>(initialPromos);
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [credential, setCredential] = useState<{ id: number; code: string } | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [liveNotice, setLiveNotice] = useState("");
  const [unavailable, setUnavailable] = useState(false);
  const stream = useLotStream([lotId]);
  const liveState = stream.states[lotId];
  const lastQuantity = useRef<number | null>(initialLot?.quantity ?? null);

  useEffect(() => {
    if (!liveState) return;
    setLot((current) =>
      current
        ? { ...current, quantity: liveState.quantity, discount_percent: liveState.discount_percent }
        : current,
    );
    setUnavailable(liveState.status !== "active" && liveState.status !== "sold_out");
    if (lastQuantity.current !== null && lastQuantity.current !== liveState.quantity) {
      setLiveNotice(t.liveStockUpdated.replace("{quantity}", String(liveState.quantity)));
    }
    lastQuantity.current = liveState.quantity;
  }, [liveState, t.liveStockUpdated]);

  const load = async () => {
    try {
      const [lotData, promosData] = await Promise.all([api.lot(lotId), api.promos(lotId)]);
      setLot(lotData);
      setPromos(promosData);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.genericError);
    }
  };

  useEffect(() => {
    if (!initialLot) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lotId]);

  const reserve = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!authReady) return;
    if (!token) {
      router.push("/login");
      return;
    }
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const reservation = await api.reserve(lotId, Number(quantity));
      setCredential({ id: reservation.id, code: reservation.pickup_code });
      setMessage(
        `${t.detailReserved} ${t.reservationReference}: ${reservation.id}. ${t.reservationPickupCode}: ${reservation.pickup_code}`,
      );
      await load();
    } catch (cause) {
      setError(
        cause instanceof ApiError && cause.code === "batch_already_reserved"
          ? t.reservationAlreadyExists
          : cause instanceof ApiError && cause.status === 409
            ? t.reservationUnavailable
            : cause instanceof Error
              ? cause.message
              : t.genericError,
      );
    } finally {
      setBusy(false);
    }
  };

  const generate = async () => {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await api.generatePromos(lotId, lang);
      await load();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : t.genericError);
    } finally {
      setBusy(false);
    }
  };

  if (!lot) {
    return (
      <main className="min-h-screen">
        <Header />
        <p className="px-6 pt-12 text-stone-500">{error || t.detailLoading}</p>
      </main>
    );
  }

  const finalPrice = (lot.original_price_cents * (100 - lot.discount_percent)) / 100;
  const currency = new Intl.NumberFormat(lang === "es" ? "es-CO" : "en-US", {
    style: "currency",
    currency: "USD",
  });

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-3xl px-6 pb-12 pt-8">
        {lot.image_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={lot.image_url}
            alt={lot.title}
            className="mb-6 h-64 w-full rounded-3xl object-cover"
          />
        ) : null}
        <h1 className="text-4xl font-black">{lot.title}</h1>
        <p className="mt-2 text-stone-500">{lot.description}</p>
        <Link
          href={`/shops/${lot.shop_id}`}
          className="mt-2 inline-block text-sm font-bold text-c426431 underline underline-offset-4"
        >
          {t.shopProfileLink}
        </Link>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <span className="rounded-full bg-orange-100 px-3 py-1 font-bold text-orange-700">
            {lot.discount_percent}% {t.discount}
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1">
            {lot.quantity} {t.detailQuantity}
          </span>
          <span className="rounded-full bg-stone-100 px-3 py-1">
            {t.detailExpires}:{" "}
            {new Date(lot.expires_at).toLocaleString(lang === "es" ? "es-CO" : "en-US")}
          </span>
        </div>
        <p className="mt-4 text-2xl font-bold text-emerald-600">
          {currency.format(finalPrice / 100)}
          <span className="ml-2 text-base font-normal text-stone-400 line-through">
            {currency.format(lot.original_price_cents / 100)}
          </span>
        </p>

        {authReady && token && (user?.role === "business" || user?.is_admin) ? (
          <ExpiryScanPanel
            lotId={lot.id}
            shopId={lot.shop_id}
            hasImage={Boolean(lot.image_url)}
            onConfirmed={() => {
              void api
                .lot(lotId)
                .then(setLot)
                .catch(() => setError(t.genericError));
            }}
          />
        ) : null}

        <p
          role="status"
          className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-stone-600"
        >
          <span
            aria-hidden="true"
            className={`h-2 w-2 rounded-full ${stream.status === "live" ? "bg-emerald-500" : "bg-stone-400"}`}
          />
          {stream.status === "live"
            ? t.liveStatusLive
            : stream.status === "offline"
              ? t.liveStatusOffline
              : t.liveStatusConnecting}
        </p>
        <p aria-live="polite" className="mt-2 text-sm font-semibold text-orange-700">
          {liveNotice}
        </p>
        {unavailable ? (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {t.liveUnavailable}
          </p>
        ) : null}

        {message ? (
          <p className="mt-4 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {message}
          </p>
        ) : null}
        {credential ? (
          <section
            aria-labelledby="pickup-qr-title"
            className="mt-4 flex flex-wrap items-center gap-5 rounded-3xl border border-stone-200 p-5"
          >
            <PickupQr
              reservationId={credential.id}
              pickupCode={credential.code}
              label={t.pickupQrLabel.replace("{id}", String(credential.id))}
            />
            <div className="max-w-sm">
              <h2 id="pickup-qr-title" className="text-lg font-black">
                {t.pickupQrTitle}
              </h2>
              <p className="mt-1 text-sm text-stone-600">{t.pickupQrHint}</p>
            </div>
          </section>
        ) : null}
        {error ? (
          <p className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>
        ) : null}

        <div className="mt-8 grid gap-6 md:grid-cols-2">
          {user?.role === "business" ? (
            <p className="rounded-3xl border border-stone-200 p-6 text-sm text-stone-600">
              {t.detailBusinessCannotReserve}
            </p>
          ) : (
            <form onSubmit={reserve} className="rounded-3xl border border-stone-200 p-6">
              <h2 className="mb-4 text-xl font-bold">{t.reserve}</h2>
              <label htmlFor="quantity" className="mb-1 block text-sm font-semibold">
                {t.detailReserveQuantity}
              </label>
              <input
                id="quantity"
                type="number"
                min={1}
                max={lot.quantity}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="w-full rounded-xl border border-stone-300 px-4 py-3"
              />
              <button
                type="submit"
                disabled={!authReady || busy || lot.quantity === 0 || unavailable}
                className="mt-4 w-full rounded-xl bg-emerald-600 px-4 py-3 font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
              >
                {t.detailReserveSubmit}
              </button>
            </form>
          )}

          <div className="rounded-3xl border border-stone-200 p-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">{t.detailPromos}</h2>
              {token && user?.role === "business" ? (
                <button
                  onClick={generate}
                  disabled={busy}
                  className="rounded-xl bg-orange-500 px-3 py-2 text-sm font-bold text-white hover:bg-orange-600 disabled:opacity-50"
                >
                  {t.detailGeneratePromos}
                </button>
              ) : null}
            </div>
            {promos.length ? (
              <ul className="mt-4 space-y-3">
                {promos.map((promo) => (
                  <li key={promo.id} className="rounded-xl bg-stone-100 p-4 text-sm">
                    <p className="font-semibold text-orange-600">{promo.variant}</p>
                    <p className="mt-1">{promo.text}</p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-stone-500">{t.detailNoPromos}</p>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
