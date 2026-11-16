"use client";

import "leaflet/dist/leaflet.css";
import "leaflet.markercluster/dist/MarkerCluster.css";
import "leaflet.markercluster/dist/MarkerCluster.Default.css";

import type * as Leaflet from "leaflet";
import { useEffect, useRef, useState } from "react";

import {
  boundsOf,
  DEFAULT_ZOOM,
  MARKER_PIXELS,
  markerHtml,
  MAX_ZOOM,
  PASTO_CENTER,
  TILE_ATTRIBUTION,
  TILE_URL,
  USER_ZOOM,
} from "@/lib/map";
import type { OpportunityCell, Place } from "@/lib/map-schemas";

export type FlyTarget = { latitude: number; longitude: number; zoom?: number; token: number };

type Props = {
  places: Place[];
  selectedId: string | null;
  cells: OpportunityCell[];
  userPosition: { latitude: number; longitude: number } | null;
  flyTo: FlyTarget | null;
  /** Changes when the view should be fitted to the places again, for example after a new search. */
  fitToken: number;
  label: string;
  onSelect: (place: Place) => void;
};

const FIT_PADDING: [number, number] = [40, 40];
const FIT_MAX_ZOOM = 16;
const CELL_DEGREES = 0.01;
const MIN_CELL_OPACITY = 0.12;
const MAX_CELL_OPACITY = 0.5;

type MarkerCluster = Leaflet.FeatureGroup & { addLayer: (layer: Leaflet.Layer) => unknown };

export default function MapView({
  places,
  selectedId,
  cells,
  userPosition,
  flyTo,
  fitToken,
  label,
  onSelect,
}: Props) {
  const container = useRef<HTMLDivElement>(null);
  const leaflet = useRef<typeof Leaflet | null>(null);
  const map = useRef<Leaflet.Map | null>(null);
  const cluster = useRef<MarkerCluster | null>(null);
  const overlay = useRef<Leaflet.LayerGroup | null>(null);
  const you = useRef<Leaflet.CircleMarker | null>(null);
  const onSelectRef = useRef(onSelect);
  const fitted = useRef<number | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    onSelectRef.current = onSelect;
  }, [onSelect]);

  useEffect(() => {
    let disposed = false;
    const start = async () => {
      const L = (await import("leaflet")).default;
      (window as unknown as { L: typeof Leaflet }).L = L;
      await import("leaflet.markercluster");
      if (disposed || !container.current || map.current) return;
      leaflet.current = L;
      map.current = L.map(container.current, { zoomControl: true }).setView(
        PASTO_CENTER,
        DEFAULT_ZOOM,
      );
      L.tileLayer(TILE_URL, { maxZoom: MAX_ZOOM, attribution: TILE_ATTRIBUTION }).addTo(
        map.current,
      );
      cluster.current = (
        L as unknown as { markerClusterGroup: () => MarkerCluster }
      ).markerClusterGroup();
      map.current.addLayer(cluster.current);
      overlay.current = L.layerGroup().addTo(map.current);
      setReady(true);
    };
    void start();
    return () => {
      disposed = true;
      map.current?.remove();
      map.current = null;
      cluster.current = null;
    };
  }, []);

  useEffect(() => {
    const L = leaflet.current;
    const group = cluster.current as (MarkerCluster & { clearLayers: () => void }) | null;
    if (!L || !group || !map.current) return;
    group.clearLayers();
    for (const place of places) {
      const marker = L.marker([place.latitude, place.longitude], {
        title: place.name,
        alt: place.name,
        keyboard: true,
        icon: L.divIcon({
          html: markerHtml(place, place.place_id === selectedId),
          className: "",
          iconSize: [MARKER_PIXELS, MARKER_PIXELS],
          iconAnchor: [MARKER_PIXELS / 2, MARKER_PIXELS / 2],
        }),
      });
      marker.on("click", () => onSelectRef.current(place));
      group.addLayer(marker);
    }
    const corners = boundsOf(places);
    if (corners && fitted.current !== fitToken) {
      map.current.fitBounds(corners, { padding: FIT_PADDING, maxZoom: FIT_MAX_ZOOM });
      fitted.current = fitToken;
    }
  }, [places, selectedId, fitToken, ready]);

  useEffect(() => {
    const L = leaflet.current;
    if (!L || !overlay.current) return;
    overlay.current.clearLayers();
    const peak = Math.max(1, ...cells.map((cell) => cell.total));
    for (const cell of cells) {
      const opacity =
        MIN_CELL_OPACITY + (MAX_CELL_OPACITY - MIN_CELL_OPACITY) * (cell.total / peak);
      L.rectangle(
        [
          [cell.south, cell.west],
          [cell.south + CELL_DEGREES, cell.west + CELL_DEGREES],
        ],
        {
          color: cell.somewhere_to_invite ? "#8a2f64" : "#30442a",
          weight: 1,
          fillOpacity: opacity,
          interactive: false,
        },
      ).addTo(overlay.current);
    }
  }, [cells, ready]);

  useEffect(() => {
    const L = leaflet.current;
    if (!L || !map.current) return;
    you.current?.remove();
    you.current = null;
    if (userPosition) {
      you.current = L.circleMarker([userPosition.latitude, userPosition.longitude], {
        radius: 8,
        color: "#ffffff",
        weight: 3,
        fillColor: "#1d4ed8",
        fillOpacity: 1,
      }).addTo(map.current);
    }
  }, [userPosition, ready]);

  useEffect(() => {
    if (!flyTo || !map.current) return;
    map.current.flyTo([flyTo.latitude, flyTo.longitude], flyTo.zoom ?? USER_ZOOM);
  }, [flyTo, ready]);

  return (
    <div
      ref={container}
      role="region"
      aria-label={label}
      className="h-[28rem] w-full overflow-hidden rounded-3xl border border-ce3e5dc lg:h-[36rem]"
    />
  );
}
