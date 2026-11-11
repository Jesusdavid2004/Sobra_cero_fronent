import { getTranslations, setRequestLocale } from "next-intl/server";

import Header from "@/components/Header";
import { Link } from "@/i18n/navigation";

/** SSG: stable explanatory content, generated at build time for every locale. */
export const dynamic = "force-static";

const STEPS = [
  { number: "01", title: "businessLists", description: "businessListsDescription" },
  { number: "02", title: "chooseAndReserve", description: "chooseAndReserveDescription" },
  { number: "03", title: "foodGetsRescued", description: "foodGetsRescuedDescription" },
] as const;

const RESCUE_POINTS = ["rescueGuideSignal", "rescueGuideReasons", "rescueGuideApproval"] as const;

export default async function HowItWorksPage({
  params,
}: Readonly<{ params: Promise<{ locale: string }> }>) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations({ locale });

  return (
    <main className="min-h-screen">
      <Header />
      <section className="mx-auto max-w-5xl px-6 pb-16 pt-8">
        <p className="text-sm font-bold uppercase tracking-[0.16em] text-c66804f">
          {t("howItWorks")}
        </p>
        <h1 className="mt-2 text-4xl font-black md:text-5xl">{t("howItWorksTitle")}</h1>

        <ol className="mt-8 grid gap-4 md:grid-cols-3">
          {STEPS.map((step) => (
            <li
              key={step.number}
              className="rounded-3xl border border-ce2e5d9 bg-white/80 p-6 shadow-[0_4px_0_#e2e5d9]"
            >
              <span className="text-sm font-black tracking-widest text-c78975b">{step.number}</span>
              <h2 className="mt-3 text-xl font-black">{t(step.title)}</h2>
              <p className="mt-2 leading-7 text-c5b6257">{t(step.description)}</p>
            </li>
          ))}
        </ol>

        <section
          aria-labelledby="rescue-guide-title"
          className="mt-10 rounded-[28px] bg-ce9efdc p-7 md:p-9"
        >
          <h2 id="rescue-guide-title" className="text-2xl font-black">
            {t("rescueGuideTitle")}
          </h2>
          <ul className="mt-4 space-y-3">
            {RESCUE_POINTS.map((point) => (
              <li key={point} className="flex gap-3 leading-7 text-c34442d">
                <span aria-hidden="true" className="mt-1 text-c5a803f">
                  ●
                </span>
                {t(point)}
              </li>
            ))}
          </ul>
          <p className="mt-5 text-sm text-c5b6257">{t("rescueDisclaimer")}</p>
        </section>

        <Link
          href="/market"
          className="mt-8 inline-block rounded-full bg-c30442a px-7 py-4 font-bold text-white shadow-[0_5px_0_#1e2d1a] transition hover:-translate-y-0.5 hover:bg-c253820"
        >
          {t("exploreLots")}
        </Link>
      </section>
    </main>
  );
}
