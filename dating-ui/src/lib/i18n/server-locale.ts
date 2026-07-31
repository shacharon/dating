import { cookies } from "next/headers";
import { DEFAULT_LOCALE, type AppLocale } from "@/lib/i18n/types";

/** Locale from the `locale` cookie (same source as root layout SSR). */
export async function getServerLocale(): Promise<AppLocale> {
  const cookieStore = await cookies();
  const localeCookie = cookieStore.get("locale");
  const locale = localeCookie?.value;

  if (locale === "he" || locale === "es" || locale === "en") return locale;
  return DEFAULT_LOCALE;
}
