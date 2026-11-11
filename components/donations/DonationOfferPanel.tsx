"use client";

import { useCallback, useEffect, useState } from "react";

import {
  ApiError,
  api,
  type DonationOffer,
  type ReceiverAssessment,
  type ReceiverCandidates,
} from "@/lib/api";

type Props = {
  lotId: number;
  defaultQuantity: number;
  t: Record<string, string>;
  locale: string;
};

const FIELD = "w-full rounded-xl border border-cdfe4da bg-cfbfcf9 px-4 py-3 text-sm";
const PRIMARY =
  "rounded-xl bg-c30442a px-4 py-2.5 text-sm font-bold text-white transition hover:bg-c253820 disabled:opacity-50";
const SECONDARY =
  "rounded-xl border border-ccfdac6 bg-cf4f7f1 px-4 py-2.5 text-sm font-bold text-c30442a transition hover:bg-ce9f1e1 disabled:opacity-50";
const MAX_MESSAGE_CHARS = 400;
const MAX_QUANTITY = 10000;

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

export default function DonationOfferPanel({ lotId, defaultQuantity, t, locale }: Props) {
  const [quantity, setQuantity] = useState(String(Math.max(1, defaultQuantity)));
  const [candidates, setCandidates] = useState<ReceiverCandidates | null>(null);
  const [selected, setSelected] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [drafted, setDrafted] = useState(false);
  const [offers, setOffers] = useState<DonationOffer[]>([]);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState("");

  const loadOffers = useCallback(async () => {
    try {
      setOffers(await api.lotDonationOffers(lotId));
    } catch {
      setOffers([]);
    }
  }, [lotId]);

  useEffect(() => {
    void loadOffers();
  }, [loadOffers]);

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

  const parsedQuantity = Math.min(MAX_QUANTITY, Math.max(1, Number(quantity) || 1));

  const findReceivers = () =>
    run("find", async () => {
      setSelected(null);
      setMessage("");
      setDrafted(false);
      setCandidates(await api.donationCandidates(lotId, parsedQuantity));
    });

  const draft = () =>
    run("draft", async () => {
      if (selected === null) return;
      const result = await api.draftDonationMessage(lotId, selected, locale);
      setMessage(result.text);
      setDrafted(true);
    });

  const send = () =>
    run("send", async () => {
      if (selected === null) return;
      await api.createDonationOffer(lotId, {
        receiverId: selected,
        quantity: parsedQuantity,
        message,
      });
      setCandidates(null);
      setSelected(null);
      setMessage("");
      setDrafted(false);
      await loadOffers();
    });

  const deliver = (offerId: number) =>
    run(`deliver-${offerId}`, async () => {
      await api.confirmDonationDelivery(offerId);
      await loadOffers();
    });

  const reasonText = (item: ReceiverAssessment) =>
    item.reasons.map((reason) => t[`receiverReason_${reason}`]).join(" · ");

  return (
    <section
      aria-label={t.donationTitle}
      className="mt-3 rounded-2xl border border-ce3e5dc bg-white p-4"
    >
      <h4 className="text-base font-black">{t.donationTitle}</h4>
      <p className="mt-1 text-xs text-c5b6257">{t.donationDisclaimer}</p>

      <div className="mt-3 flex flex-wrap items-end gap-3">
        <label className="text-sm font-semibold">
          <span className="mb-1 block">{t.donationQuantity}</span>
          <input
            type="number"
            min={1}
            max={MAX_QUANTITY}
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            className="w-28 rounded-xl border border-cdfe4da bg-cfbfcf9 px-3 py-2 text-sm"
          />
        </label>
        <button
          type="button"
          onClick={findReceivers}
          disabled={busy !== null}
          className={SECONDARY}
        >
          {busy === "find" ? t.donationFinding : t.donationFind}
        </button>
      </div>

      {candidates ? (
        <div className="mt-4">
          <p className="rounded-xl bg-cf0f3ec px-3 py-2 text-xs text-c5b6257">
            {t.donationApproximate}
          </p>
          {candidates.compatible.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">{t.donationNoReceivers}</p>
          ) : (
            <fieldset className="mt-3 grid gap-2">
              <legend className="mb-1 text-sm font-bold">{t.donationCompatible}</legend>
              {candidates.compatible.map((item) => (
                <label
                  key={item.receiver.id}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-ce3e5dc p-3 text-sm"
                >
                  <input
                    type="radio"
                    name={`receiver-${lotId}`}
                    checked={selected === item.receiver.id}
                    onChange={() => setSelected(item.receiver.id)}
                    className="mt-1"
                  />
                  <span>
                    <span className="block font-bold">{item.receiver.name}</span>
                    <span className="block text-stone-600">
                      {fill(t.donationReceiverFacts, {
                        distance: item.distance_km,
                        from: item.receiver.open_from,
                        until: item.receiver.open_until,
                        capacity: item.receiver.max_quantity,
                      })}
                    </span>
                    <span className="block text-xs text-c5b6257">
                      {fill(t.donationRecent, { count: item.recent_accepted })}
                    </span>
                  </span>
                </label>
              ))}
            </fieldset>
          )}
          {candidates.excluded.length > 0 ? (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer font-bold">
                {fill(t.donationExcluded, { count: candidates.excluded.length })}
              </summary>
              <ul className="mt-2 grid gap-1">
                {candidates.excluded.map((item) => (
                  <li key={item.receiver.id}>
                    <span className="font-semibold">{item.receiver.name}</span>{" "}
                    <span className="text-stone-600">{reasonText(item)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}

          {selected !== null ? (
            <div className="mt-4">
              <label className="block text-sm font-semibold">
                <span className="mb-1 block">{t.donationMessage}</span>
                <textarea
                  value={message}
                  maxLength={MAX_MESSAGE_CHARS}
                  rows={3}
                  onChange={(event) => setMessage(event.target.value)}
                  className={FIELD}
                />
              </label>
              {drafted ? (
                <p className="mt-1 text-xs text-c2f4a22">
                  <span className="mr-2 rounded-full bg-c30442a px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                    {t.rescueAiBadge}
                  </span>
                  {t.donationDrafted}
                </p>
              ) : null}
              <div className="mt-3 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={draft}
                  disabled={busy !== null}
                  className={SECONDARY}
                >
                  {busy === "draft" ? t.donationDrafting : t.donationDraft}
                </button>
                <button type="button" onClick={send} disabled={busy !== null} className={PRIMARY}>
                  {t.donationSend}
                </button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="mt-3 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      ) : null}

      {offers.length > 0 ? (
        <ul className="mt-4 grid gap-2" aria-label={t.donationOffersTitle}>
          {offers.map((offer) => (
            <li
              key={offer.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-cf4f7f1 px-3 py-2 text-sm"
            >
              <span>
                <span className="font-bold">{offer.receiver_name}</span>{" "}
                {fill(t.donationOfferUnits, { count: offer.quantity })}
              </span>
              <span className="flex items-center gap-2">
                <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold">
                  {t[`offerStatus_${offer.status}`]}
                </span>
                {offer.status === "accepted" ? (
                  <button
                    type="button"
                    onClick={() => deliver(offer.id)}
                    disabled={busy !== null}
                    className={SECONDARY}
                  >
                    {t.donationConfirmDelivery}
                  </button>
                ) : null}
              </span>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
