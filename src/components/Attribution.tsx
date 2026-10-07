"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { captureAttribution, track } from "@/lib/analytics";
import { useSession, useShop } from "@/store/shop";

export function Attribution() {
  const pathname = usePathname();
  const setCustomer = useSession((s) => s.setCustomer);
  useEffect(() => {
    captureAttribution();
    // Ссылка креатора вида ?promo=CODE сразу применяет промокод в корзине.
    const code = new URLSearchParams(window.location.search).get("promo");
    if (code && /^[A-Za-z0-9_]{3,20}$/.test(code))
      fetch(`/api/promo?code=${encodeURIComponent(code)}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((p) => { if (p?.code) { useShop.getState().setPromo({ code: p.code, percent: p.percent }); track("promo_from_link", { code: p.code }); } })
        .catch(() => {});
    // Подтягиваем клиента из серверной сессии один раз при загрузке.
    api.me().then((r) => setCustomer(r.customer)).catch(() => setCustomer(null));
  }, [setCustomer]);
  useEffect(() => track("page_view", { path: pathname }), [pathname]);
  return null;
}
