import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";
import { getLocaleDirection, DEFAULT_LOCALE } from "@/lib/i18n";
import { getServerLocale } from "@/lib/i18n/server-locale";
import { isCapacitorBuild } from "@/lib/capacitor-build";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "Dating App",
    template: "%s | Dating App",
  },
  description: "Find your match",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = isCapacitorBuild() ? DEFAULT_LOCALE : await getServerLocale();
  const dir = getLocaleDirection(locale);

  return (
    <html lang={locale} dir={dir}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
