"use client";

import Header from "@/components/Header";
import MapExplorer from "@/components/map/MapExplorer";
import { useApp } from "@/providers/AppProviders";

/** CSR: the map reads the browser's position and a live view of the directory. */
export default function MapPage() {
  const { t, lang } = useApp();

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-c66804f">{t.mapEyebrow}</p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">{t.mapTitle}</h1>
        <p className="mt-3 max-w-3xl text-stone-600">{t.mapDescription}</p>
        <MapExplorer t={t} locale={lang} />
      </section>
    </main>
  );
}
