"use client";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { api } from "@/lib/api";
import { captureAttribution, track } from "@/lib/analytics";
import { useSession } from "@/store/shop";

export function Attribution() {
  const pathname = usePathname();
  const setCustomer = useSession((s) => s.setCustomer);
  useEffect(() => {
    captureAttribution();
    // Подтягиваем клиента из серверной сессии один раз при загрузке.
    api.me().then((r) => setCustomer(r.customer)).catch(() => setCustomer(null));
  }, [setCustomer]);
  useEffect(() => track("page_view", { path: pathname }), [pathname]);
  return null;
}
