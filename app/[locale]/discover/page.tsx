"use client";

import DiscoveryPanel from "@/components/discovery/DiscoveryPanel";
import Header from "@/components/Header";
import { useApp } from "@/providers/AppProviders";

/** CSR: the search depends on the customer's clock times, budget and position, all read in the browser. */
export default function DiscoverPage() {
  const { t, lang } = useApp();

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-c66804f">
          {t.discoveryEyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">{t.discoveryTitle}</h1>
        <p className="mt-3 max-w-2xl text-stone-600">{t.discoveryDescription}</p>
        <DiscoveryPanel t={t} locale={lang} />
      </section>
    </main>
  );
}
