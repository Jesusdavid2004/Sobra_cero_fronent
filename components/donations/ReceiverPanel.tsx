"use client";

import { useCallback, useEffect, useState } from "react";

import { ApiError, api, type DonationOffer, type Receiver, type ReceiverInput } from "@/lib/api";
import { DEFAULT_LOCATION, DISCOVERY_CATEGORIES } from "@/lib/discovery";

type Props = { t: Record<string, string>; locale: string };

const FIELD = "w-full rounded-xl border border-cdfe4da bg-cfbfcf9 px-4 py-3 text-sm";
const PRIMARY =
  "rounded-xl bg-c30442a px-5 py-3 text-sm font-bold text-white transition hover:bg-c253820 disabled:opacity-50";
const SECONDARY =
  "rounded-xl border border-ccfdac6 bg-cf4f7f1 px-4 py-2.5 text-sm font-bold text-c30442a transition hover:bg-ce9f1e1 disabled:opacity-50";
const DEFAULT_CAPACITY = 50;
const MINUTES_PER_HOUR = 60;

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

function categoryLabel(t: Record<string, string>, category: string): string {
  return t[`category${category[0].toUpperCase()}${category.slice(1)}`] ?? category;
}

export default function ReceiverPanel({ t, locale }: Props) {
  const [loaded, setLoaded] = useState(false);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [receiver, setReceiver] = useState<Receiver | null>(null);
  const [offers, setOffers] = useState<DonationOffer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [categories, setCategories] = useState<string[]>([]);
  const [capacity, setCapacity] = useState(String(DEFAULT_CAPACITY));
  const [refrigerated, setRefrigerated] = useState(false);
  const [openFrom, setOpenFrom] = useState("09:00");
  const [openUntil, setOpenUntil] = useState("17:00");
  const [position, setPosition] = useState<{ latitude: number; longitude: number }>({
    ...DEFAULT_LOCATION,
  });
  const intl = locale === "es" ? "es-CO" : "en-US";
  const dateTime = new Intl.DateTimeFormat(intl, { dateStyle: "medium", timeStyle: "short" });

  const load = useCallback(async () => {
    try {
      setReceiver(await api.myReceiver());
      setOffers(await api.myReceiverOffers());
    } catch (cause) {
      if (cause instanceof ApiError && cause.status === 401) setNeedsLogin(true);
      else if (!(cause instanceof ApiError && cause.status === 404))
        setError(t.donationErrorGeneric);
    } finally {
      setLoaded(true);
    }
  }, [t.donationErrorGeneric]);

  useEffect(() => {
    void load();
  }, [load]);

  const run = async (key: string, action: () => Promise<void>) => {
    setBusy(key);
    setError("");
    try {
      await action();
    } catch (cause) {
      const known = cause instanceof ApiError && cause.code ? t[`donationError_${cause.code}`] : "";
      setError(known || t.donationErrorGeneric);
    } finally {
      setBusy(null);
    }
  };

  const toggleCategory = (category: string) =>
    setCategories((current) =>
      current.includes(category)
        ? current.filter((item) => item !== category)
        : [...current, category],
    );

  const useMyLocation = () =>
    navigator.geolocation?.getCurrentPosition((result) =>
      setPosition({ latitude: result.coords.latitude, longitude: result.coords.longitude }),
    );

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    void run("register", async () => {
      const input: ReceiverInput = {
        name: name.trim(),
        latitude: position.latitude,
        longitude: position.longitude,
        accepted_categories: categories,
        max_quantity: Math.max(1, Number(capacity) || DEFAULT_CAPACITY),
        can_store_refrigerated: refrigerated,
        open_from: openFrom,
        open_until: openUntil,
        utc_offset_minutes: -new Date().getTimezoneOffset(),
      };
      setReceiver(await api.registerReceiver(input));
      setOffers(await api.myReceiverOffers());
    });
  };

  const answer = (offerId: number, action: "accept" | "decline") =>
    run(`${action}-${offerId}`, async () => {
      await api.answerDonationOffer(offerId, action);
      setOffers(await api.myReceiverOffers());
    });

  if (!loaded) return <p className="mt-8 text-sm text-stone-600">{t.receiverLoading}</p>;
  if (needsLogin) return <p className="mt-8 text-sm text-stone-600">{t.receiverLogin}</p>;

  return (
    <div className="mt-8 grid gap-6">
      <p className="rounded-2xl bg-cf0f3ec px-4 py-3 text-xs text-c5b6257">
        {t.donationDisclaimer}
      </p>
      {error ? (
        <p role="alert" className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {receiver ? (
        <>
          <section
            aria-labelledby="receiver-profile-title"
            className="rounded-3xl border border-ce0e5da bg-white p-5 md:p-7"
          >
            <h2 id="receiver-profile-title" className="text-xl font-black">
              {receiver.name}
            </h2>
            <p className="mt-2 text-sm text-stone-600">
              {fill(t.receiverProfileFacts, {
                categories: receiver.accepted_categories
                  .map((category) => categoryLabel(t, category))
                  .join(", "),
                capacity: receiver.max_quantity,
                from: receiver.open_from,
                until: receiver.open_until,
              })}{" "}
              {receiver.can_store_refrigerated ? t.receiverRefrigerated : t.receiverNotRefrigerated}
            </p>
          </section>

          <section aria-labelledby="receiver-offers-title">
            <h2 id="receiver-offers-title" className="text-xl font-black">
              {t.receiverOffersTitle}
            </h2>
            {offers.length === 0 ? (
              <p className="mt-3 text-sm text-stone-600">{t.receiverNoOffers}</p>
            ) : (
              <ul className="mt-4 grid gap-4 md:grid-cols-2">
                {offers.map((offer) => (
                  <li
                    key={offer.id}
                    className="rounded-3xl border border-ce3e5dc bg-white p-5 shadow-[0_12px_30px_rgba(42,55,32,0.08)]"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <h3 className="text-lg font-black">{offer.lot_title}</h3>
                      <span className="rounded-full bg-cf3f5ef px-3 py-1 text-xs font-bold">
                        {t[`offerStatus_${offer.status}`]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-stone-600">
                      {fill(t.receiverOfferFrom, {
                        shop: offer.shop_name,
                        count: offer.quantity,
                        time: dateTime.format(new Date(offer.closes_at)),
                      })}
                    </p>
                    {offer.message ? (
                      <p className="mt-3 rounded-xl bg-cf4f7f1 px-3 py-2 text-sm">
                        {offer.message}
                      </p>
                    ) : null}
                    {offer.status === "offered" ? (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => answer(offer.id, "accept")}
                          className={PRIMARY}
                        >
                          {t.receiverAccept}
                        </button>
                        <button
                          type="button"
                          disabled={busy !== null}
                          onClick={() => answer(offer.id, "decline")}
                          className={SECONDARY}
                        >
                          {t.receiverDecline}
                        </button>
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </section>
        </>
      ) : (
        <form
          onSubmit={submit}
          aria-labelledby="receiver-form-title"
          className="rounded-3xl border border-ce0e5da bg-white p-5 md:p-7"
        >
          <h2 id="receiver-form-title" className="text-xl font-black">
            {t.receiverFormTitle}
          </h2>
          <p className="mt-2 text-sm text-stone-600">{t.receiverFormHint}</p>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <label className="text-sm font-semibold sm:col-span-2">
              <span className="mb-1 block">{t.receiverName}</span>
              <input
                required
                minLength={2}
                value={name}
                onChange={(event) => setName(event.target.value)}
                className={FIELD}
              />
            </label>
            <fieldset className="sm:col-span-2">
              <legend className="mb-1 text-sm font-semibold">{t.receiverCategories}</legend>
              <div className="flex flex-wrap gap-3">
                {DISCOVERY_CATEGORIES.map((category) => (
                  <label key={category} className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={categories.includes(category)}
                      onChange={() => toggleCategory(category)}
                    />
                    {categoryLabel(t, category)}
                  </label>
                ))}
              </div>
            </fieldset>
            <label className="text-sm font-semibold">
              <span className="mb-1 block">{t.receiverCapacity}</span>
              <input
                type="number"
                min={1}
                value={capacity}
                onChange={(event) => setCapacity(event.target.value)}
                className={FIELD}
              />
            </label>
            <label className="flex items-center gap-2 text-sm font-semibold sm:mt-7">
              <input
                type="checkbox"
                checked={refrigerated}
                onChange={(event) => setRefrigerated(event.target.checked)}
              />
              {t.receiverCanRefrigerate}
            </label>
            <label className="text-sm font-semibold">
              <span className="mb-1 block">{t.receiverOpenFrom}</span>
              <input
                type="time"
                required
                value={openFrom}
                onChange={(event) => setOpenFrom(event.target.value)}
                className={FIELD}
              />
            </label>
            <label className="text-sm font-semibold">
              <span className="mb-1 block">{t.receiverOpenUntil}</span>
              <input
                type="time"
                required
                value={openUntil}
                onChange={(event) => setOpenUntil(event.target.value)}
                className={FIELD}
              />
            </label>
          </div>
          <p className="mt-3 text-xs text-c5b6257">
            {t.receiverLocationNote}{" "}
            <button type="button" onClick={useMyLocation} className="font-bold underline">
              {t.discoveryUseMyLocation}
            </button>
          </p>
          <button
            type="submit"
            disabled={busy !== null || categories.length === 0}
            className={`${PRIMARY} mt-5`}
          >
            {t.receiverSave}
          </button>
        </form>
      )}
    </div>
  );
}
