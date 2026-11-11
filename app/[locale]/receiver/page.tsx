"use client";

import ReceiverPanel from "@/components/donations/ReceiverPanel";
import Header from "@/components/Header";
import { useApp } from "@/providers/AppProviders";

/** CSR: the profile and offers belong to the signed-in account. */
export default function ReceiverPage() {
  const { t, lang } = useApp();

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-c66804f">
          {t.receiverEyebrow}
        </p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">{t.receiverTitle}</h1>
        <p className="mt-3 max-w-2xl text-stone-600">{t.receiverDescription}</p>
        <ReceiverPanel t={t} locale={lang} />
      </section>
    </main>
  );
}
