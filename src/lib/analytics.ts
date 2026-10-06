"use client";
// Единая точка аналитики. Компоненты вызывают только track(); куда уходят события
// (Яндекс Метрика, PostHog, пиксели) решается здесь. Персональные данные сюда не передаём.

type Props = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    ym?: (id: number, method: string, ...args: unknown[]) => void;
    posthog?: { capture: (e: string, p?: Props) => void };
  }
}

const YM_ID = Number(process.env.NEXT_PUBLIC_YM_ID || 0);

export function track(event: string, props: Props = {}) {
  if (typeof window === "undefined") return;
  const payload = { ...props, ...attribution() };
  window.dataLayer = window.dataLayer || [];
  window.dataLayer.push({ event, ...payload });
  window.posthog?.capture(event, payload);
  if (YM_ID && window.ym) window.ym(YM_ID, "reachGoal", event, payload);
  if (process.env.NODE_ENV !== "production") console.debug("[track]", event, payload);
}

// UTM и код креатора сохраняются при первом визите и прикрепляются ко всем событиям и заказу.
const KEY = "nabi_attr";
export function captureAttribution() {
  if (typeof window === "undefined") return;
  try {
    if (localStorage.getItem(KEY)) return;
    const u = new URL(window.location.href);
    const data: Record<string, string> = {};
    ["utm_source", "utm_medium", "utm_campaign", "utm_content", "ref"].forEach((k) => {
      const v = u.searchParams.get(k);
      if (v) data[k] = v;
    });
    data.landing = u.pathname;
    data.first_seen = new Date().toISOString();
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {}
}

export function attribution(): Props {
  try {
    const d = JSON.parse(localStorage.getItem(KEY) || "{}");
    return { utm_source: d.utm_source, creator_ref: d.ref };
  } catch {
    return {};
  }
}
