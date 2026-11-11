"use client";

import { useEffect, useState } from "react";

type Props = { iso: string; locale: string };

const UTC = "UTC";

function format(iso: string, locale: string, timeZone?: string): string {
  return new Intl.DateTimeFormat(locale === "es" ? "es-CO" : "en-US", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone,
  }).format(new Date(iso));
}

/**
 * Server render and first client render both show the instant in UTC, so they always match;
 * after hydration it switches to the visitor's own time zone. This avoids showing the server's
 * time zone to someone in another one.
 */
export default function LocalDateTime({ iso, locale }: Props) {
  const [text, setText] = useState(() => `${format(iso, locale, UTC)} ${UTC}`);

  useEffect(() => {
    setText(format(iso, locale));
  }, [iso, locale]);

  return <time dateTime={iso}>{text}</time>;
}
