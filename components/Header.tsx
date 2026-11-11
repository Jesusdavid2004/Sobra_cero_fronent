"use client";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { useState } from "react";

import { useApp } from "@/providers/AppProviders";

export default function Header() {
  const {
    t,
    lang,
    setLang,
    theme,
    themePreference,
    toggleTheme,
    token,
    authReady,
    authError,
    user,
    logout,
  } = useApp();
  const router = useRouter();
  const pathname = usePathname();
  const [logoutError, setLogoutError] = useState(false);

  const handleLogout = async () => {
    setLogoutError(false);
    try {
      await logout();
      router.push("/");
    } catch {
      setLogoutError(true);
    }
  };

  return (
    <header className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-6 py-6">
      <Link href="/" className="leading-tight">
        <p className="text-2xl font-black tracking-tight text-[#30442a]">
          <span className="rounded-lg bg-[#c7e49d] px-2 py-0.5">{t.title}</span>
        </p>
        <p className="text-xs uppercase tracking-[0.2em] text-stone-500">{t.eyebrow}</p>
      </Link>
      <nav className="flex flex-wrap items-center gap-2" aria-label={t.mainNavigation}>
        <Link
          href="/"
          className={`rounded-full border px-3 py-2 text-sm ${pathname === "/" ? "border-[#30442a] bg-[#30442a] text-white" : ""}`}
        >
          {t.navHome}
        </Link>
        {authReady && token ? (
          <>
            {user?.role === "business" ? (
              <>
                <Link
                  href="/shop"
                  className={`rounded-full border px-3 py-2 text-sm ${pathname === "/shop" ? "border-[#30442a] bg-[#30442a] text-white" : ""}`}
                >
                  {t.shop}
                </Link>
                <Link
                  href="/lots/new"
                  className={`rounded-full border px-3 py-2 text-sm ${pathname === "/lots/new" ? "border-[#30442a] bg-[#30442a] text-white" : ""}`}
                >
                  {t.newLot}
                </Link>
              </>
            ) : null}
            {user?.is_admin ? (
              <Link href="/admin" className="rounded-full border px-3 py-2 text-sm">
                {t.admin}
              </Link>
            ) : null}
            <button onClick={handleLogout} className="rounded-full border px-3 py-2 text-sm">
              {t.logout}
            </button>
          </>
        ) : authReady ? (
          <Link href="/login" className="rounded-full border px-3 py-2 text-sm">
            {t.login}
          </Link>
        ) : null}
        <button
          aria-label={t.themeLabel}
          title={t.themeMode.replace(
            "{mode}",
            themePreference === "system"
              ? t.themeSystem
              : themePreference === "dark"
                ? t.themeDark
                : t.themeLight,
          )}
          onClick={toggleTheme}
          className="rounded-full border px-3 py-2 text-sm"
        >
          {theme === "dark" ? "☀" : "☾"}
        </button>
        <button
          aria-label={`${t.changeLanguage}: ${t.language}`}
          onClick={() => setLang(lang === "en" ? "es" : "en")}
          className="rounded-full border px-3 py-2 text-sm"
        >
          {t.language}
        </button>
      </nav>
      {authReady && (authError || logoutError) ? (
        <p role="alert" className="basis-full text-right text-sm text-red-600">
          {t.genericError}
        </p>
      ) : null}
    </header>
  );
}
