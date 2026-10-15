"use client";
// Telegram Mini App: доступ к Telegram.WebApp, когда сайт открыт внутри Telegram.

type Btn = { show(): void; hide(): void; onClick(cb: () => void): void; offClick(cb: () => void): void; isVisible: boolean };
export type TgWebApp = {
  initData: string;
  initDataUnsafe: { start_param?: string; user?: { first_name?: string; last_name?: string; language_code?: string } };
  version: string;
  platform: string;
  isVersionAtLeast(v: string): boolean;
  ready(): void;
  expand(): void;
  disableVerticalSwipes?(): void;
  setHeaderColor?(c: string): void;
  setBackgroundColor?(c: string): void;
  setBottomBarColor?(c: string): void;
  openLink(url: string): void;
  openTelegramLink(url: string): void;
  requestContact?(cb: (shared: boolean, res?: { response?: string; responseUnsafe?: { contact?: { phone_number?: string } } }) => void): void;
  BackButton: Btn;
  HapticFeedback?: { impactOccurred(s: "light" | "medium" | "heavy" | "rigid" | "soft"): void; notificationOccurred(t: "error" | "success" | "warning"): void };
};

declare global {
  interface Window { Telegram?: { WebApp?: TgWebApp }; TelegramWebviewProxy?: unknown }
}

/** Открыт ли сайт внутри Telegram (до загрузки их скрипта). */
export function looksLikeTelegram() {
  if (typeof window === "undefined") return false;
  try {
    // Данные Telegram приходят в адресе только при запуске — запоминаем на всю сессию (перезагрузки, переходы).
    if (location.hash.includes("tgWebAppData")) sessionStorage.setItem("nabi_tma", "1");
    return !!sessionStorage.getItem("nabi_tma") || !!sessionStorage.getItem("__telegram__initParams") || !!window.TelegramWebviewProxy;
  } catch {
    return false;
  }
}

/** Telegram.WebApp, если сайт открыт как Mini App (есть подписанные данные), иначе null. */
export function tma(): TgWebApp | null {
  if (typeof window === "undefined") return null;
  const w = window.Telegram?.WebApp;
  return w && w.initData ? w : null;
}

/** Имя из Telegram — подставляем в анкету нового клиента. */
export let tgName: { first: string; last: string } | null = null;
export const setTgName = (n: { first: string; last: string } | null) => { tgName = n; };

/** Лёгкая вибрация (только внутри Telegram). */
export const haptic = (kind: "light" | "success" = "light") => {
  const h = tma()?.HapticFeedback;
  if (!h) return;
  if (kind === "success") h.notificationOccurred("success"); else h.impactOccurred("light");
};
