"use client";
// Вход клиента из любого места сайта: номер → код из Telegram → (для новых) имя, фамилия, дата рождения.
// LoginSheet — шторка поверх текущей страницы; после входа клиент остаётся там, где был.
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/analytics";
import { ApiError, api, storedUtm, type ApiCustomer } from "@/lib/api";
import { useSession, useShop, useUi } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";

const digitsOf = (v: string) => v.replace(/\D/g, "").replace(/^998/, "").slice(0, 9);
const fmtPhone = (d: string) => `+998 ${[d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean).join(" ")}`.trim();
const inputCls = "h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[16px] outline-none focus:border-accent";
const Spinner = () => <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />;

export function AuthFlow({ onDone }: { onDone: (c: ApiCustomer) => void }) {
  const { lang, t } = useI18n();
  const setCustomer = useSession((s) => s.setCustomer);
  const [step, setStep] = useState<"phone" | "code" | "profile" | "no_tg">("phone");
  const [phone, setPhone] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [demo, setDemo] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [bd, setBd] = useState({ d: "", m: "", y: "" });
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [err, setErr] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const codeRef = useRef<HTMLInputElement>(null);
  const d = digitsOf(phone);
  const ru = lang === "ru";

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  const errorText = (e: unknown) => {
    const c = e instanceof ApiError ? e.code : "";
    if (c === "too_many_requests" || c === "too_many_attempts") return t.coTooMany;
    if (c === "expired" || c === "request_not_found") return t.coExpired;
    return t.coGatewayDown;
  };

  const request = async () => {
    if (d.length !== 9) return;
    setBusy(true); setErr({});
    try {
      const r = await api.requestCode(d);
      track("otp_requested", { channel: r.channel, place: "login" });
      if (r.channel === "none") { setStep("no_tg"); return; }
      setRequestId(r.requestId!); setDemo(r.demoCode ?? null); setCode(""); setResendIn(60); setStep("code");
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      setErr({ phone: errorText(e) });
    } finally {
      setBusy(false);
    }
  };

  const verify = async (v: string) => {
    setCode(v); setErr({});
    if (v.length < 6 || !requestId) return;
    setBusy(true);
    try {
      const r = await api.verifyCode(requestId, v);
      track("otp_verified", { is_new: r.isNew, place: "login" });
      setCustomer(r.customer);
      if (r.customer.needsProfile) setStep("profile");
      else onDone(r.customer);
    } catch (e) {
      const left = e instanceof ApiError ? (e.data.attemptsLeft as number | undefined) : undefined;
      setErr({ code: e instanceof ApiError && e.code === "code_invalid" ? `${t.coWrongCode}${left !== undefined ? " " + t.coAttemptsLeft(left) : ""}` : errorText(e) });
      setCode("");
    } finally {
      setBusy(false);
    }
  };

  const birth = () => {
    const dd = Number(bd.d), mm = Number(bd.m), yy = Number(bd.y);
    const date = new Date(yy, mm - 1, dd);
    const age = (Date.now() - date.getTime()) / (365.25 * 86400000);
    return dd && mm && yy && date.getDate() === dd && age >= 14 && age <= 100 ? `${yy}-${String(mm).padStart(2, "0")}-${String(dd).padStart(2, "0")}` : null;
  };

  const saveProfile = async () => {
    const e: Record<string, string> = {};
    if (!first.trim()) e.first = t.coRequired;
    if (!last.trim()) e.last = t.coRequired;
    if (!birth()) e.birth = t.coBirthInvalid;
    if (!consent) e.consent = t.coRequired;
    setErr(e);
    if (Object.keys(e).length) return;
    setBusy(true);
    try {
      const r = await api.saveProfile({ firstName: first.trim(), lastName: last.trim(), birthDate: birth(), consent: true, marketing, lang, utm: storedUtm() });
      setCustomer(r.customer);
      track("signup_completed", { marketing_opt_in: marketing, place: "login" });
      onDone(r.customer);
    } catch {
      setErr({ profile: t.coOrderError });
    } finally {
      setBusy(false);
    }
  };

  const years = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 14 - i);

  if (step === "no_tg")
    return (
      <div className="space-y-3 text-[15px]">
        <p className="font-semibold">{ru ? "На этот номер не пришлёт код Telegram" : "Bu raqamga Telegram kod yubora olmaydi"}</p>
        <p className="text-ink/70">{ru ? "Вход работает через Telegram. Без него можно оформить заказ — менеджер подтвердит его звонком." : "Kirish Telegram orqali ishlaydi. Usiz ham buyurtma berish mumkin — menejer qo'ng'iroq qilib tasdiqlaydi."}</p>
        <button type="button" onClick={() => setStep("phone")} className="text-accent">{t.coChangePhone}</button>
      </div>
    );

  if (step === "profile")
    return (
      <div className="space-y-3">
        <p className="text-[15px] text-ink/75">{ru ? "Вы у нас впервые. Пара слов о себе — и готово." : "Siz birinchi marta kirdingiz. O'zingiz haqingizda bir necha so'z."}</p>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label htmlFor="first" className="text-[13px] font-medium text-ink/70">{t.coFirst} *</label>
            <input id="first" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} className={`${inputCls} mt-1`} />
            {err.first && <p className="mt-1 text-[12px] text-warn">{err.first}</p>}
          </div>
          <div>
            <label htmlFor="last" className="text-[13px] font-medium text-ink/70">{t.coLast} *</label>
            <input id="last" autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} className={`${inputCls} mt-1`} />
            {err.last && <p className="mt-1 text-[12px] text-warn">{err.last}</p>}
          </div>
        </div>
        <div>
          <label htmlFor="bd-d" className="text-[13px] font-medium text-ink/70">{t.coBirth} *</label>
          <div className="mt-1 grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
            <select id="bd-d" aria-label={t.coDay} value={bd.d} onChange={(e) => setBd({ ...bd, d: e.target.value })} className={inputCls}><option value="">{t.coDay}</option>{Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select>
            <select id="bd-m" aria-label={t.coMonth} value={bd.m} onChange={(e) => setBd({ ...bd, m: e.target.value })} className={inputCls}><option value="">{t.coMonth}</option>{t.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}</select>
            <select id="bd-y" aria-label={t.coYear} value={bd.y} onChange={(e) => setBd({ ...bd, y: e.target.value })} className={inputCls}><option value="">{t.coYear}</option>{years.map((y) => <option key={y} value={y}>{y}</option>)}</select>
          </div>
          <p className="mt-1 text-[12px] text-muted">{err.birth ? <span className="text-warn">{err.birth}</span> : t.coBirthHint}</p>
        </div>
        <label className="flex items-start gap-2.5 text-[14px]">
          <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
          <span>{t.coConsent} <span className="text-accent">*</span>{err.consent && <span className="block text-[12px] text-warn">{err.consent}</span>}</span>
        </label>
        <label className="flex items-start gap-2.5 text-[14px]">
          <input id="marketing" type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
          {t.coMarketing}
        </label>
        {err.profile && <p role="alert" className="text-[13px] text-warn">{err.profile}</p>}
        <button type="button" onClick={saveProfile} disabled={busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-card bg-accent font-semibold text-white disabled:opacity-60">
          {busy && <Spinner />} {ru ? "Готово" : "Tayyor"}
        </button>
      </div>
    );

  if (step === "code")
    return (
      <div className="space-y-3">
        <p className="text-[15px]">{t.coCodeSent(fmtPhone(d))}</p>
        <p className="rounded-xl bg-accent-soft px-3 py-2 text-[13px] text-ink/80">{t.coCodeHint}{demo && <><br /><b>Демо-режим:</b> код {demo}</>}</p>
        <input ref={codeRef} id="otp" aria-label={t.coCode} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} disabled={busy}
          onChange={(e) => verify(e.target.value.replace(/\D/g, "").slice(0, 6))} placeholder="••••••"
          className={`${inputCls} text-center text-[24px] font-bold tracking-[0.5em] tabular`} />
        {err.code && <p role="alert" className="text-[13px] text-warn">{err.code}</p>}
        <div className="flex justify-between text-[14px]">
          <button type="button" onClick={() => setStep("phone")} className="text-muted underline">{t.coChangePhone}</button>
          {resendIn > 0 ? <span className="text-muted tabular">{t.coResend(resendIn)}</span> : <button type="button" onClick={request} className="text-accent">{t.coResendNow}</button>}
        </div>
      </div>
    );

  return (
    <div className="space-y-3">
      <label htmlFor="phone" className="text-[13px] font-medium text-ink/70">{t.coPhone}</label>
      <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={fmtPhone(d)} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && request()} className={`${inputCls} tabular`} />
      {err.phone && <p role="alert" className="text-[13px] text-warn">{err.phone}</p>}
      <button type="button" onClick={request} disabled={d.length !== 9 || busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-card bg-accent font-semibold text-white transition active:scale-[.98] disabled:opacity-40">
        {busy ? <Spinner /> : <Icon name="telegram" size={20} />} {t.coGetCode}
      </button>
      <p className="text-[12px] text-muted">{ru ? "Пароль не нужен: каждый раз присылаем код в Telegram. На этом устройстве вы останетесь в аккаунте." : "Parol kerak emas: har safar Telegramga kod yuboramiz. Bu qurilmada akkauntda qolasiz."}</p>
    </div>
  );
}

const REASON = {
  default: { ru: ["Вход в NABI", "Заказы, адреса, корзина и избранное — на всех ваших устройствах."], uz: ["NABI'ga kirish", "Buyurtmalar, manzillar, savat va sevimlilar — barcha qurilmalaringizda."] },
  favorites: { ru: ["Сохраните избранное", "Войдите, чтобы избранное не потерялось и открывалось с любого телефона."], uz: ["Sevimlilarni saqlang", "Sevimlilar yo'qolmasligi va istalgan telefondan ochilishi uchun kiring."] },
  orders: { ru: ["Ваши заказы", "Войдите по номеру, на который оформляли заказ."], uz: ["Buyurtmalaringiz", "Buyurtma bergan raqamingiz bilan kiring."] },
} as const;

export function LoginSheet() {
  const { lang } = useI18n();
  const login = useUi((s) => s.login);
  const close = useUi((s) => s.closeLogin);
  const [toast, setToast] = useState<string | null>(null);
  const pathname = usePathname();
  // Шторка закрывается при переходе на другую страницу.
  useEffect(() => { close(); }, [pathname, close]);
  useEffect(() => {
    if (!login.open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = ""; };
  }, [login.open, close]);

  const done = (c: ApiCustomer) => {
    close();
    setToast(lang === "ru" ? `Вы вошли${c.firstName ? `, ${c.firstName}` : ""}` : `Kirdingiz${c.firstName ? `, ${c.firstName}` : ""}`);
    setTimeout(() => setToast(null), 2600);
  };
  const [title, sub] = REASON[login.reason][lang];

  return (
    <>
      {login.open && (
        <div className="fixed inset-0 z-[70] flex items-end justify-center bg-ink/40 md:items-center" onClick={close}>
          <div role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}
            className="anim-sheet max-h-[92dvh] w-full overflow-y-auto rounded-t-[28px] bg-white p-5 pb-[calc(20px+env(safe-area-inset-bottom,0px))] md:max-w-[440px] md:rounded-panel md:p-7">
            <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-line md:hidden" />
            <div className="flex items-start gap-3">
              <div className="min-w-0 flex-1">
                <h2 className="text-[22px] font-bold leading-tight">{title}</h2>
                <p className="mt-1 text-[14px] text-ink/70">{sub}</p>
              </div>
              <button type="button" onClick={close} aria-label="Закрыть" className="grid size-9 shrink-0 place-items-center rounded-full bg-surface"><Icon name="close" size={18} /></button>
            </div>
            <div className="mt-5"><AuthFlow onDone={done} /></div>
          </div>
        </div>
      )}
      {toast && <div role="status" className="anim-fade fixed bottom-24 left-1/2 z-[80] -translate-x-1/2 rounded-full bg-ink px-4 py-2.5 text-[14px] text-white shadow-float md:bottom-8">{toast}</div>}
    </>
  );
}

/**
 * Синхронизация корзины и избранного с аккаунтом.
 * При входе — слияние того, что в браузере, с сохранённым; дальше каждое изменение уходит на сервер.
 * Гостю после 3-го товара в избранном один раз за визит предлагаем войти.
 */
const MARK = "nabi_synced_for";

export function AccountSync() {
  const customer = useSession((s) => s.customer);
  const loaded = useSession((s) => s.loaded);
  const openLogin = useUi((s) => s.openLogin);
  const syncedFor = useRef<string | null>(null);
  const applying = useRef(false);

  useEffect(() => {
    if (!loaded || !customer || customer.needsProfile || syncedFor.current === customer.id) return;
    syncedFor.current = customer.id;
    const s = useShop.getState();
    // Слияние — только при первом входе на этом устройстве. Дальше главный — аккаунт:
    // иначе удалённый на телефоне товар «воскресал» бы из старой корзины ноутбука.
    let mergedBefore = false;
    try { mergedBefore = localStorage.getItem(MARK) === customer.id; } catch { /* приватный режим */ }
    const req = mergedBefore ? fetch("/api/me/state", { cache: "no-store" }).then((r) => (r.ok ? r.json() : Promise.reject())) : api.syncState("merge", s.cart, s.favorites);
    req.then((r: { cart: Record<string, number>; favorites: string[] }) => {
      try { localStorage.setItem(MARK, customer.id); } catch { /* приватный режим */ }
      applying.current = true;
      useShop.getState().replaceSynced(r.cart, r.favorites);
      applying.current = false;
    }).catch(() => { syncedFor.current = null; });
  }, [loaded, customer]);

  useEffect(() => {
    if (!customer) {
      syncedFor.current = null;
      // Вышли (в том числе удалённо): следующий вход на этом устройстве снова сольёт корзину гостя с аккаунтом.
      if (loaded) try { localStorage.removeItem(MARK); } catch { /* приватный режим */ }
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsub = useShop.subscribe((s, prev) => {
      if (applying.current || syncedFor.current !== customer.id) return;
      if (s.cart === prev.cart && s.favorites === prev.favorites) return;
      clearTimeout(timer);
      timer = setTimeout(() => { const st = useShop.getState(); api.syncState("replace", st.cart, st.favorites).catch(() => {}); }, 700);
    });
    return () => { unsub(); clearTimeout(timer); };
  }, [customer, loaded]);

  useEffect(() => {
    if (!loaded || customer) return;
    return useShop.subscribe((s, prev) => {
      if (s.favorites.length >= 3 && s.favorites.length > prev.favorites.length) {
        try {
          if (sessionStorage.getItem("nabi_fav_prompt")) return;
          sessionStorage.setItem("nabi_fav_prompt", "1");
        } catch { /* приватный режим */ }
        setTimeout(() => openLogin("favorites"), 900);
      }
    });
  }, [loaded, customer, openLogin]);

  return null;
}

/** Выход: сессия на сервере закрывается, корзина и избранное на этом устройстве очищаются. */
export async function logoutEverywhere(all: boolean) {
  await api.logout(all).catch(() => {});
  useShop.getState().resetPersonal();
  try { localStorage.removeItem(MARK); } catch { /* приватный режим */ }
  useSession.getState().setCustomer(null);
}
