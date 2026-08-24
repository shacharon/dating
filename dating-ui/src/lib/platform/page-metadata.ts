import type { Metadata } from "next";
import { getCopy, DEFAULT_LOCALE } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { isCapacitorBuild } from "@/lib/platform/capacitor-build";
import type { AppCopySchema } from "@/lib/i18n/types";

/**
 * Build route metadata from cookie locale + i18n copy.
 * Page titles use the root layout template (`%s | Dating App`) unless `absolute`.
 */
export async function buildPageMetadata(options: {
  title: (copy: AppCopySchema) => string;
  description?: (copy: AppCopySchema) => string;
  /** Full document title (skips `| Dating App` template). */
  absolute?: boolean;
}): Promise<Metadata> {
  const locale = isCapacitorBuild() ? DEFAULT_LOCALE : await getServerLocale();
  const copy = getCopy(locale);
  const pageTitle = options.title(copy);

  return {
    title: options.absolute ? { absolute: pageTitle } : pageTitle,
    ...(options.description
      ? { description: options.description(copy) }
      : {}),
  };
}
