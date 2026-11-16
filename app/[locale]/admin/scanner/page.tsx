"use client";

import Header from "@/components/Header";
import ScannerDashboard from "@/components/scanner/ScannerDashboard";
import { useApp } from "@/providers/AppProviders";

/** CSR: administrator-only data behind the signed-in session. */
export default function ScannerPage() {
  const { t, lang } = useApp();

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-6xl px-6 pb-16 pt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-c66804f">
          {t.scannerEyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">{t.scannerTitle}</h1>
        <p className="mt-3 max-w-3xl text-stone-600">{t.scannerDescription}</p>
        <ScannerDashboard t={t} locale={lang} />
      </section>
    </main>
  );
}
