"use client";
// Сайт как Telegram Mini App: вход без кода, кнопка «Назад» Telegram, вибрация, ссылки креаторов (startapp).
// Вне Telegram ничего не загружает и ничего не делает.
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { track } from "@/lib/analytics";
import { haptic, looksLikeTelegram, setTgName, tma } from "@/lib/tma";
import { useSession, useShop } from "@/store/shop";
import { useI18n } from "./I18n";

const SCRIPT = "https://telegram.org/js/telegram-web-app.js";

export function TelegramMiniApp() {
  const [ready, setReady] = useState(false);
  const { lang } = useI18n();
  const router = useRouter();
  const pathname = usePathname();
  const loaded = useSession((s) => s.loaded);
  const customer = useSession((s) => s.customer);
  const authed = useRef<string | null>(null);

  // 1. Подключаем скрипт Telegram только внутри Telegram.
  useEffect(() => {
    if (!looksLikeTelegram()) return;
    const init = () => {
      const w = tma();
      if (!w) return;
      document.documentElement.classList.add("tma");
      w.ready();
      w.expand();
      if (w.isVersionAtLeast("7.7")) w.disableVerticalSwipes?.(); // иначе прокрутка вниз сворачивает приложение
      if (w.isVersionAtLeast("6.1")) { w.setHeaderColor?.("#ffffff"); w.setBackgroundColor?.("#ffffff"); }
      if (w.isVersionAtLeast("7.10")) w.setBottomBarColor?.("#ffffff");
      track("tma_open", { platform: w.platform, start: w.initDataUnsafe.start_param ?? null });
      setReady(true);
      window.dispatchEvent(new Event("nabi:tma-ready"));
    };
    if (window.Telegram?.WebApp) { init(); return; }
    const s = document.createElement("script");
    s.src = SCRIPT;
    s.async = true;
    s.onload = init;
    document.head.appendChild(s);
  }, []);

  // 2. Ссылка из Telegram с параметром: c_КОД[_ссылка] — переход креатора, p_товар — сразу на товар. Один раз за запуск.
  useEffect(() => {
    if (!ready) return;
    const sp = tma()?.initDataUnsafe.start_param;
    if (!sp) return;
    try {
      if (sessionStorage.getItem("nabi_tma_start") === sp) return;
      sessionStorage.setItem("nabi_tma_start", sp);
    } catch { /* приватный режим */ }
    const c = /^c_([A-Za-z0-9]{3,20})(?:_([\w-]{1,20}))?$/.exec(sp);
    const p = /^p_([a-z0-9-]{1,60})$/.exec(sp);
    if (c) window.location.replace(`/c/${c[1].toUpperCase()}${c[2] ? `/${c[2]}` : ""}`);
    else if (p) router.replace(`/${lang}/p/${p[1]}`);
  }, [ready, router, lang]);

  // 3. Вход по подписи Telegram: знакомый аккаунт входит сразу; вошедший (в т.ч. кодом) — привязываем Telegram,
  //    чтобы в следующий раз входить без кода.
  const customerId = customer?.id ?? null;
  useEffect(() => {
    const w = tma();
    if (!ready || !w || !loaded) return;
    const key = customerId ?? "guest";
    if (authed.current === key) return;
    try { if (!customerId && sessionStorage.getItem("nabi_tma_noauto")) return; } catch { /* приватный режим */ }
    authed.current = key;
    fetch("/api/tma/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData: w.initData }) })
      .then((r) => (r.ok ? r.json() : null))
      .then((r) => {
        if (!r) return;
        if (r.customer && !customerId) { authed.current = r.customer.id; useSession.getState().setCustomer(r.customer); track("tma_login", { auto: true }); }
        if (r.needPhone) setTgName(r.tgName ?? null);
      })
      .catch(() => {});
  }, [ready, loaded, customerId]);

  // 4. Кнопка «Назад» Telegram на всех страницах, кроме главной.
  useEffect(() => {
    const w = tma();
    if (!ready || !w) return;
    const home = pathname === `/${lang}` || pathname === "/";
    const back = () => (window.history.length > 1 ? router.back() : router.push(`/${lang}`));
    if (home) { w.BackButton.hide(); return; }
    w.BackButton.show();
    w.BackButton.onClick(back);
    return () => w.BackButton.offClick(back);
  }, [ready, pathname, lang, router]);

  // 5. Вибрация при добавлении в корзину.
  useEffect(() => {
    if (!ready) return;
    return useShop.subscribe((s, prev) => {
      const n = (c: Record<string, number>) => Object.values(c).reduce((a, b) => a + b, 0);
      if (n(s.cart) > n(prev.cart)) haptic("light");
    });
  }, [ready]);

  // 6. Внешние ссылки открываем средствами Telegram (t.me — внутри Telegram, остальное — в браузере).
  useEffect(() => {
    if (!ready) return;
    const onClick = (e: MouseEvent) => {
      const a = (e.target as HTMLElement).closest("a");
      if (!a || !a.href) return;
      const url = new URL(a.href, location.href);
      if (url.origin === location.origin) return;
      const w = tma();
      if (!w) return;
      e.preventDefault();
      if (url.hostname === "t.me") w.openTelegramLink(url.href); else w.openLink(url.href);
    };
    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, [ready]);

  return null;
}
