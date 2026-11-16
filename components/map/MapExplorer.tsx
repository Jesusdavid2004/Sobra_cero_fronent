"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";

import GeoSearch from "@/components/map/GeoSearch";
import MapFilters from "@/components/map/MapFilters";
import OpportunityPanel from "@/components/map/OpportunityPanel";
import PlaceCard from "@/components/map/PlaceCard";
import PlaceList from "@/components/map/PlaceList";
import PromotionsPanel from "@/components/map/PromotionsPanel";
import type { FlyTarget } from "@/components/map/MapView";
import { api } from "@/lib/api";
import { DEFAULT_FILTERS, toQuery, type MapFilters as Filters } from "@/lib/map";
import type {
  GeocodeResult,
  OpportunityCell,
  Place,
  PlacesResult,
  Promotion,
} from "@/lib/map-schemas";

type Props = { t: Record<string, string>; locale: string };

const TYPING_DELAY_MS = 300;
const PLACE_ZOOM = 17;
const CELL_ZOOM = 15;
const CELL_HALF_DEGREES = 0.005;

const MapView = dynamic(() => import("@/components/map/MapView"), {
  ssr: false,
  loading: () => (
    <div className="h-[28rem] w-full animate-pulse rounded-3xl bg-cf0f3ec lg:h-[36rem]" />
  ),
});

export default function MapExplorer({ t, locale }: Props) {
  const [filters, setFilters] = useState<Filters>(DEFAULT_FILTERS);
  const [typed, setTyped] = useState("");
  const [result, setResult] = useState<PlacesResult | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [cells, setCells] = useState<OpportunityCell[]>([]);
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [userPosition, setUserPosition] = useState<{ latitude: number; longitude: number } | null>(
    null,
  );
  const [locationMessage, setLocationMessage] = useState("");
  const [flyTo, setFlyTo] = useState<FlyTarget | null>(null);
  const [fitToken, setFitToken] = useState(0);

  useEffect(() => {
    const timer = setTimeout(() => setTyped(filters.text), TYPING_DELAY_MS);
    return () => clearTimeout(timer);
  }, [filters.text]);

  const { layers, categories, onlyWithOffers, includeDemo } = filters;
  const query = useMemo(
    () =>
      toQuery({ ...DEFAULT_FILTERS, layers, categories, onlyWithOffers, includeDemo, text: typed }),
    [layers, categories, onlyWithOffers, includeDemo, typed],
  );

  useEffect(() => {
    let cancelled = false;
    setFailed(false);
    api
      .mapPlaces(query)
      .then((data) => {
        if (cancelled) return;
        setResult(data);
        setFitToken((current) => current + 1);
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
    };
  }, [query, attempt]);

  useEffect(() => {
    api
      .mapPromotions()
      .then(setPromotions)
      .catch(() => setPromotions([]));
  }, []);

  useEffect(() => {
    if (!filters.showOpportunities) return;
    api
      .mapOpportunities(includeDemo)
      .then(setCells)
      .catch(() => setCells([]));
  }, [filters.showOpportunities, includeDemo]);

  const places = useMemo(() => result?.places ?? [], [result]);
  const selected = places.find((place) => place.place_id === selectedId) ?? null;

  const fly = useCallback((latitude: number, longitude: number, zoom: number) => {
    setFlyTo((current) => ({ latitude, longitude, zoom, token: (current?.token ?? 0) + 1 }));
  }, []);

  const select = (place: Place) => {
    setSelectedId(place.place_id);
    fly(place.latitude, place.longitude, PLACE_ZOOM);
  };

  const pickAddress = (found: GeocodeResult) => fly(found.latitude, found.longitude, PLACE_ZOOM);

  const focusCell = (cell: OpportunityCell) =>
    fly(cell.south + CELL_HALF_DEGREES, cell.west + CELL_HALF_DEGREES, CELL_ZOOM);

  const useMyLocation = () => {
    setLocationMessage("");
    if (!navigator.geolocation) {
      setLocationMessage(t.mapLocationDenied);
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const here = { latitude: position.coords.latitude, longitude: position.coords.longitude };
        setUserPosition(here);
        setLocationMessage(t.mapLocationShared);
        fly(here.latitude, here.longitude, CELL_ZOOM);
      },
      () => setLocationMessage(t.mapLocationDenied),
    );
  };

  return (
    <div className="mt-8 grid gap-6 lg:grid-cols-[22rem_1fr]">
      <div className="grid content-start gap-5">
        <GeoSearch t={t} onPick={pickAddress} />
        <button
          type="button"
          onClick={useMyLocation}
          className="rounded-xl border border-ccfdac6 bg-cf4f7f1 px-4 py-2.5 text-sm font-bold text-c30442a transition hover:bg-ce9f1e1"
        >
          {t.mapUseMyLocation}
        </button>
        {locationMessage ? (
          <p role="status" className="-mt-3 text-xs text-c5b6257">
            {locationMessage}
          </p>
        ) : null}
        <MapFilters filters={filters} t={t} onChange={setFilters} />
        {failed ? (
          <div role="alert" className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            <p>{t.mapError}</p>
            <button
              type="button"
              onClick={() => setAttempt((current) => current + 1)}
              className="mt-2 font-bold underline"
            >
              {t.mapRetry}
            </button>
          </div>
        ) : result === null ? (
          <p role="status" className="text-sm text-stone-600">
            {t.mapLoading}
          </p>
        ) : (
          <PlaceList places={places} selectedId={selectedId} t={t} onSelect={select} />
        )}
      </div>

      <div className="grid content-start gap-5">
        <MapView
          places={places}
          selectedId={selectedId}
          cells={filters.showOpportunities ? cells : []}
          userPosition={userPosition}
          flyTo={flyTo}
          fitToken={fitToken}
          label={t.mapMapLabel}
          onSelect={select}
        />
        {selected ? (
          <PlaceCard
            place={selected}
            attribution={result?.attribution ?? ""}
            t={t}
            locale={locale}
            onClose={() => setSelectedId(null)}
          />
        ) : null}
        {filters.showOpportunities ? (
          <OpportunityPanel cells={cells} t={t} onFocus={focusCell} />
        ) : null}
        <PromotionsPanel promotions={promotions} t={t} locale={locale} />
        {result?.attribution ? <p className="text-xs text-c5b6257">{result.attribution}</p> : null}
      </div>
    </div>
  );
}
