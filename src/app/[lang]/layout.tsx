import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import "../globals.css";
import { isLang, LANGS } from "@/lib/i18n";
import { I18nProvider } from "@/components/I18n";
import { BottomNav, Header, HeaderSpacer } from "@/components/Header";
import { MegaMenu } from "@/components/MegaMenu";
import { Footer } from "@/components/Footer";
import { SearchOverlay } from "@/components/SearchOverlay";
import { AddedSheet } from "@/components/AddedSheet";
import { Attribution } from "@/components/Attribution";

export const metadata: Metadata = {
  title: { default: "NABI — оригинальная корейская косметика в Узбекистане", template: "%s · NABI" },
  description: "Оригинальная корейская косметика с проверкой каждого заказа. Доставка по Ташкенту завтра, по Узбекистану за 2–4 дня.",
};

export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export function generateStaticParams() {
  return LANGS.map((lang) => ({ lang }));
}

export default async function LangLayout({ children, params }: { children: React.ReactNode; params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  if (!isLang(lang)) notFound();
  return (
    <html lang={lang} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "document.documentElement.classList.add('js')" }} />
      </head>
      <body>
        <I18nProvider lang={lang}>
          <Attribution />
          <Header />
          <MegaMenu />
          <HeaderSpacer />
          <main className="min-h-[60vh]">{children}</main>
          <Footer lang={lang} />
          <BottomNav />
          <SearchOverlay />
          <AddedSheet />
        </I18nProvider>
      </body>
    </html>
  );
}
