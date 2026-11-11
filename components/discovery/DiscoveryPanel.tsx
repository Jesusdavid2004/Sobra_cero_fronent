"use client";

import { useState } from "react";

import { Link } from "@/i18n/navigation";
import { ApiError, api, type DiscoveryResult, type LotAssessment } from "@/lib/api";
import {
  applyIntent,
  DEFAULT_LOCATION,
  DEFAULT_RADIUS_KM,
  DISCOVERY_CATEGORIES,
  EMPTY_FORM,
  intentFoundNothing,
  MAX_RADIUS_KM,
  resolveWindow,
  toBudgetCents,
  type DiscoveryForm,
} from "@/lib/discovery";

type Props = { t: Record<string, string>; locale: string };
type Coordinates = { latitude: number; longitude: number; source: "default" | "device" };

const FIELD = "w-full rounded-xl border border-cdfe4da bg-cfbfcf9 px-4 py-3 text-sm";
const PRIMARY_BUTTON =
  "rounded-xl bg-c30442a px-5 py-3 text-sm font-bold text-white transition hover:bg-c253820 disabled:opacity-50";
const SECONDARY_BUTTON =
  "rounded-xl border border-ccfdac6 bg-cf4f7f1 px-5 py-3 text-sm font-bold text-c30442a transition hover:bg-ce9f1e1 disabled:opacity-50";
const CENTS_PER_UNIT = 100;
const MAX_QUANTITY = 100;

function fill(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (text, [key, value]) => text.replace(`{${key}}`, String(value)),
    template,
  );
}

export default function DiscoveryPanel({ t, locale }: Props) {
  const intl = locale === "es" ? "es-CO" : "en-US";
  const money = new Intl.NumberFormat(intl, { style: "currency", currency: "USD" });
  const clock = new Intl.DateTimeFormat(intl, { timeStyle: "short" });
  const [form, setForm] = useState<DiscoveryForm>(EMPTY_FORM);
  const [text, setText] = useState("");
  const [aiBusy, setAiBusy] = useState(false);
  const [aiMessage, setAiMessage] = useState("");
  const [aiError, setAiError] = useState("");
  const [coords, setCoords] = useState<Coordinates>({ ...DEFAULT_LOCATION, source: "default" });
  const [locationMessage, setLocationMessage] = useState("");
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<DiscoveryResult | null>(null);

  const update = (key: keyof DiscoveryForm, value: string) =>
    setForm((current) => ({ ...current, [key]: value }));

  const readWithAi = async () => {
    setAiBusy(true);
    setAiMessage("");
    setAiError("");
    try {
      const intent = await api.parseDiscoveryRequest(text.trim(), locale);
      if (intentFoundNothing(intent)) {
        setAiMessage(t.discoveryAiNothing);
        return;
      }
      setForm((current) => applyIntent(current, intent));
      setAiMessage(t.discoveryAiFilled);
    } catch (cause) {
      setAiError(
        cause instanceof ApiError && cause.status === 401 ? t.discoveryAiLogin : t.discoveryAiError,
      );
    } finally {
      setAiBusy(false);
    }
  };

  const useMyLocation = () => {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage(t.discoveryLocationDenied);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          source: "device",
        });
        setLocationMessage(t.discoveryLocationDevice);
      },
      () => setLocationMessage(t.discoveryLocationDenied),
    );
  };

  const search = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setError("");
    const window = resolveWindow(form.from, form.until, new Date());
    if (!window) {
      setError(t.discoveryWindowInvalid);
      return;
    }
    setSearching(true);
    try {
      setResult(
        await api.discoverLots({
          latitude: coords.latitude,
          longitude: coords.longitude,
          windowStart: window.start,
          windowEnd: window.end,
          radiusKm: DEFAULT_RADIUS_KM,
          quantity: Math.max(1, Math.min(MAX_QUANTITY, Number(form.quantity) || 1)),
          budgetCents: toBudgetCents(form.budget),
          category: form.category || undefined,
        }),
      );
    } catch {
      setResult(null);
      setError(t.discoveryError);
    } finally {
      setSearching(false);
    }
  };

  const reasonText = (lot: LotAssessment) =>
    lot.reasons.map((reason) => t[`discoveryReason_${reason}`]).join(" · ");

  return (
    <div className="mt-8 grid gap-6">
      <section
        aria-labelledby="discovery-ai-title"
        className="rounded-3xl border border-ce0e5da bg-white p-5 md:p-7"
      >
        <h2 id="discovery-ai-title" className="text-xl font-black">
          {t.discoveryAiTitle}
        </h2>
        <p className="mt-2 text-sm text-stone-600">{t.discoveryAiHint}</p>
        <label className="mt-4 block text-sm font-semibold">
          <span className="mb-1 block">{t.discoveryAiLabel}</span>
          <textarea
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={300}
            rows={2}
            placeholder={t.discoveryAiPlaceholder}
            className={FIELD}
          />
        </label>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={readWithAi}
            disabled={aiBusy || text.trim().length < 3}
            className={SECONDARY_BUTTON}
          >
            {aiBusy ? t.discoveryAiBusy : t.discoveryAiButton}
          </button>
          {aiMessage ? (
            <p role="status" className="text-sm text-c426431">
              {aiMessage}
            </p>
          ) : null}
          {aiError ? (
            <p role="alert" className="text-sm text-red-700">
              {aiError}
            </p>
          ) : null}
        </div>
      </section>

      <form
        onSubmit={search}
        aria-labelledby="discovery-form-title"
        className="rounded-3xl border border-ce0e5da bg-white p-5 md:p-7"
      >
        <h2 id="discovery-form-title" className="text-xl font-black">
          {t.discoveryFormTitle}
        </h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <label className="text-sm font-semibold">
            <span className="mb-1 block">{t.discoveryBudget}</span>
            <input
              type="number"
              min={0}
              step="0.01"
              inputMode="decimal"
              value={form.budget}
              onChange={(event) => update("budget", event.target.value)}
              className={FIELD}
            />
          </label>
          <label className="text-sm font-semibold">
            <span className="mb-1 block">{t.discoveryFrom}</span>
            <input
              type="time"
              value={form.from}
              onChange={(event) => update("from", event.target.value)}
              className={FIELD}
            />
          </label>
          <label className="text-sm font-semibold">
            <span className="mb-1 block">{t.discoveryUntil}</span>
            <input
              type="time"
              value={form.until}
              onChange={(event) => update("until", event.target.value)}
              className={FIELD}
            />
          </label>
          <label className="text-sm font-semibold">
            <span className="mb-1 block">{t.discoveryQuantity}</span>
            <input
              type="number"
              min={1}
              max={MAX_QUANTITY}
              value={form.quantity}
              onChange={(event) => update("quantity", event.target.value)}
              className={FIELD}
            />
          </label>
          <label className="text-sm font-semibold">
            <span className="mb-1 block">{t.discoveryCategory}</span>
            <select
              value={form.category}
              onChange={(event) => update("category", event.target.value)}
              className={FIELD}
            >
              <option value="">{t.discoveryAnyCategory}</option>
              {DISCOVERY_CATEGORIES.map((category) => (
                <option key={category} value={category}>
                  {t[`category${category[0].toUpperCase()}${category.slice(1)}`]}
                </option>
              ))}
            </select>
          </label>
          <div className="text-sm">
            <span className="mb-1 block font-semibold">{t.discoveryLocation}</span>
            <button type="button" onClick={useMyLocation} className={`${SECONDARY_BUTTON} w-full`}>
              {t.discoveryUseMyLocation}
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-c5b6257">
          {coords.source === "default" ? t.discoveryLocationDefault : t.discoveryLocationDevice}
          {locationMessage && coords.source === "default" ? ` ${locationMessage}` : ""}
        </p>
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <button type="submit" disabled={searching} className={PRIMARY_BUTTON}>
            {searching ? t.discoverySearching : t.discoverySearch}
          </button>
          <p className="text-xs text-c5b6257">
            {fill(t.discoveryRadiusNote, { km: DEFAULT_RADIUS_KM, max: MAX_RADIUS_KM })}
          </p>
        </div>
        {error ? (
          <p role="alert" className="mt-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </p>
        ) : null}
      </form>

      {result ? (
        <section aria-live="polite" aria-labelledby="discovery-results-title">
          <p className="rounded-2xl bg-cf0f3ec px-4 py-3 text-xs text-c5b6257">
            {t.discoveryApproximate}
          </p>
          {result.nearest_unreachable ? (
            <p className="mt-4 rounded-2xl border border-ccfdac6 bg-cf4f7f1 px-4 py-3 text-sm">
              {fill(t.discoveryNearestUnreachable, {
                title: result.nearest_unreachable.title,
                reason: reasonText(result.nearest_unreachable),
              })}
            </p>
          ) : null}
          <h2 id="discovery-results-title" className="mt-6 text-xl font-black">
            {t.discoveryFeasibleTitle}
          </h2>
          {result.feasible.length === 0 ? (
            <p className="mt-3 text-sm text-stone-600">{t.discoveryNoFeasible}</p>
          ) : (
            <ul className="mt-4 grid gap-4 md:grid-cols-2">
              {result.feasible.map((lot) => (
                <li
                  key={lot.lot_id}
                  className="rounded-3xl border border-ce3e5dc bg-white p-5 shadow-[0_12px_30px_rgba(42,55,32,0.08)]"
                >
                  <h3 className="text-lg font-black">{lot.title}</h3>
                  <p className="mt-1 text-2xl font-black text-c426431">
                    {money.format(lot.unit_price_cents / CENTS_PER_UNIT)}
                  </p>
                  <ul className="mt-3 grid gap-1 text-sm text-stone-600">
                    <li>
                      {fill(t.discoveryDistance, {
                        distance: lot.distance_km,
                        minutes: lot.travel_minutes,
                      })}
                    </li>
                    <li>
                      {fill(t.discoveryCloses, { time: clock.format(new Date(lot.closes_at)) })}
                    </li>
                    <li>{fill(t.discoverySlack, { minutes: lot.slack_minutes })}</li>
                    <li>{fill(t.discoveryStock, { count: lot.available_quantity })}</li>
                  </ul>
                  <Link
                    href={`/lots/${lot.lot_id}`}
                    className="mt-4 block rounded-xl bg-c33452b px-4 py-3 text-center font-bold text-white transition hover:bg-c263820"
                  >
                    {t.discoveryView}
                  </Link>
                </li>
              ))}
            </ul>
          )}
          {result.excluded.length > 0 ? (
            <details className="mt-6 rounded-2xl border border-ce3e5dc bg-white p-4">
              <summary className="cursor-pointer text-sm font-bold">
                {fill(t.discoveryExcludedTitle, { count: result.excluded.length })}
              </summary>
              <ul className="mt-3 grid gap-2 text-sm">
                {result.excluded.map((lot) => (
                  <li key={lot.lot_id} className="flex flex-wrap items-baseline gap-x-3">
                    <span className="font-semibold">{lot.title}</span>
                    <span className="text-stone-600">{reasonText(lot)}</span>
                  </li>
                ))}
              </ul>
            </details>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
