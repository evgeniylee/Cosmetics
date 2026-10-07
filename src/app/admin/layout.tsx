import type { Metadata, Viewport } from "next";
import "../globals.css";

export const metadata: Metadata = { title: { default: "Админка NABI", template: "%s · Админка NABI" }, robots: { index: false, follow: false } };
export const viewport: Viewport = { width: "device-width", initialScale: 1, viewportFit: "cover", themeColor: "#ffffff" };

export default function AdminRoot({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body className="bg-surface">{children}</body>
    </html>
  );
}
