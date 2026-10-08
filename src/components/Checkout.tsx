"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { CITIES, SUPPORT_URL } from "@/lib/shop";
import { useCartTotals } from "@/lib/useCart";
import { track } from "@/lib/analytics";
import { ApiError, api, storedUtm, type ApiAddress } from "@/lib/api";
import { useSession, useShop } from "@/store/shop";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";
import { PromoField, Summary } from "./Cart";
import { ProductImage } from "./ProductVisual";

// ---- Телефон: +998 XX XXX XX XX ----
const digitsOf = (v: string) => v.replace(/\D/g, "").replace(/^998/, "").slice(0, 9);
function fmtPhone(d: string) {
  const p = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 7), d.slice(7, 9)].filter(Boolean);
  return `+998 ${p.join(" ")}`.trim();
}

type Step = "phone" | "code" | "profile" | "delivery";

function StepCard({ n, title, done, active, onEdit, summary, children }: { n: number; title: string; done: boolean; active: boolean; onEdit?: () => void; summary?: React.ReactNode; children: React.ReactNode }) {
  const { t } = useI18n();
  return (
    <section className={`rounded-panel p-5 transition-shadow duration-300 md:p-6 ${active ? "shadow-float ring-1 ring-line" : "bg-surface"}`}>
      <div className="flex items-center gap-3">
        <span className={`grid size-8 shrink-0 place-items-center rounded-full text-[14px] font-bold transition-colors ${done ? "bg-success text-white" : active ? "bg-accent text-white" : "bg-white text-muted"}`}>
          {done ? <Icon name="check" size={16} /> : n}
        </span>
        <h2 className={`text-[18px] font-bold ${!active && !done ? "text-muted" : ""}`}>{title}</h2>
        {done && !active && onEdit && <button type="button" onClick={onEdit} className="ml-auto text-[14px] text-accent">{t.edit}</button>}
      </div>
      {done && !active && summary && <div className="mt-2 pl-11 text-[14px] text-ink/75">{summary}</div>}
      {active && <div className="anim-panel mt-5">{children}</div>}
    </section>
  );
}

function Field({ label, id, error, children, hint }: { label: string; id: string; error?: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <label htmlFor={id} className="text-[13px] font-medium text-ink/70">{label}</label>
      <div className="mt-1">{children}</div>
      {hint && !error && <p className="mt-1 text-[12px] text-muted">{hint}</p>}
      {error && <p role="alert" className="mt-1 text-[12px] text-warn">{error}</p>}
    </div>
  );
}
const inputCls = "h-12 w-full rounded-xl border border-line bg-white px-3.5 text-[16px] outline-none focus:border-accent";
const Spinner = () => <span className="size-5 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden />;

export function Checkout() {
  const { lang, t } = useI18n();
  const totals = useCartTotals();
  const customer = useSession((s) => s.customer);
  const sessionLoaded = useSession((s) => s.loaded);
  const setCustomer = useSession((s) => s.setCustomer);
  const setCity = useShop((s) => s.setCity);
  const clearCart = useShop((s) => s.clearCart);
  const promo = useShop((s) => s.promo);
  const samples = useShop((s) => s.samples);

  const [step, setStep] = useState<Step>("phone");
  const [phone, setPhone] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [demoCode, setDemoCode] = useState<string | null>(null);
  const [guest, setGuest] = useState(false); // нет Telegram: заказ без кода, подтверждение звонком
  const [code, setCode] = useState("");
  const [resendIn, setResendIn] = useState(0);
  const [verified, setVerified] = useState(false);
  const [returning, setReturning] = useState(false);
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [bd, setBd] = useState({ d: "", m: "", y: "" });
  const [consent, setConsent] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [address, setAddress] = useState("");
  const [comment, setComment] = useState("");
  const [pay, setPay] = useState<"click" | "payme" | "cash">("click");
  const [saved, setSaved] = useState<ApiAddress[]>([]);
  const [addrId, setAddrId] = useState<string | "new">("new");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ number: string; code: string | null; status: string } | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  // Уже вошедший клиент: сразу к доставке, адрес из прошлого заказа.
  useEffect(() => {
    if (!sessionLoaded || !customer || verified) return;
    setPhone(customer.phone);
    setFirst(customer.firstName ?? "");
    setLast(customer.lastName ?? "");
    setVerified(true);
    if (customer.needsProfile) { setStep("profile"); return; }
    setReturning(true);
    setStep("delivery");
    loadSaved();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionLoaded, customer, verified, setCity]);

  // Сохранённые адреса и способ оплаты из прошлого заказа: вошедшему клиенту остаётся нажать одну кнопку.
  function loadSaved() {
    api.addresses().then((r) => {
      setSaved(r.addresses);
      const def = r.addresses.find((a) => a.is_default) ?? r.addresses[0];
      if (def) pickAddress(def);
    }).catch(() => {});
    api.me().then((r) => { if (r.lastPayment === "click" || r.lastPayment === "payme" || r.lastPayment === "cash") setPay(r.lastPayment); }).catch(() => {});
  }
  function pickAddress(a: ApiAddress | "new") {
    if (a === "new") { setAddrId("new"); setAddress(""); setComment(""); return; }
    setAddrId(a.id); setAddress(a.address); setComment(a.comment ?? ""); setCity(a.city);
  }

  useEffect(() => {
    if (resendIn <= 0) return;
    const id = setTimeout(() => setResendIn((s) => s - 1), 1000);
    return () => clearTimeout(id);
  }, [resendIn]);

  useEffect(() => {
    if (totals.hydrated && !done) track("begin_checkout", { cart_value: totals.total, items_count: totals.count });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [totals.hydrated]);

  if (!totals.hydrated) return <div className="wrap h-[60vh]" />;

  if (done)
    return (
      <div className="wrap max-w-[640px] py-12 text-center">
        <span className="anim-bump mx-auto grid size-16 place-items-center rounded-full bg-success text-white"><Icon name="check" size={32} /></span>
        <h1 className="mt-5 text-[30px] font-bold">{t.coDoneTitle}</h1>
        <p className="mt-2 text-ink/75">{t.coDoneText(done.number)}</p>
        {done.status === "needs_call" && <p className="mt-2 text-[14px]">{t.coNeedsCall}</p>}
        {done.code && <p className="mt-2 text-[14px] text-accent">{t.coDoneCreator(done.code)}</p>}
        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-card bg-accent px-5 font-semibold text-white"><Icon name="telegram" size={18} /> {t.coTrack}</a>
          <Link href={`/${lang}/account`} className="grid h-12 place-items-center rounded-card bg-surface px-5 font-semibold">{t.profile}</Link>
        </div>
      </div>
    );

  if (totals.lines.length === 0)
    return (
      <div className="wrap py-16 text-center">
        <h1 className="h-section">{t.cartEmpty}</h1>
        <Link href={`/${lang}/catalog`} className="mt-6 inline-grid h-12 place-items-center rounded-card bg-accent px-6 font-semibold text-white">{t.catalog}</Link>
      </div>
    );

  const phoneDigits = digitsOf(phone);
  const isTashkent = totals.city === "tashkent";
  const payMethod = !isTashkent && pay === "cash" ? "click" : pay;

  const errorText = (e: unknown) => {
    const c = e instanceof ApiError ? e.code : "";
    if (c === "too_many_requests" || c === "too_many_attempts") return t.coTooMany;
    if (c === "expired" || c === "request_not_found") return t.coExpired;
    if (c === "gateway_unavailable") return t.coGatewayDown;
    return t.coGatewayDown;
  };

  const requestCode = async () => {
    if (phoneDigits.length !== 9) { setErrors({ phone: t.coRequired }); return; }
    setErrors({});
    setBusy(true);
    try {
      const r = await api.requestCode(phoneDigits);
      track("otp_requested", { channel: r.channel });
      if (r.channel === "none") { setGuest(true); setStep("profile"); return; }
      setRequestId(r.requestId!);
      setDemoCode(r.demoCode ?? null);
      setStep("code");
      setResendIn(60);
      setCode("");
      setTimeout(() => codeRef.current?.focus(), 50);
    } catch (e) {
      setErrors({ phone: errorText(e) });
      track("otp_failed", { reason: e instanceof ApiError ? e.code : "network" });
    } finally {
      setBusy(false);
    }
  };

  const checkCode = async (v: string) => {
    setCode(v);
    setErrors({});
    if (v.length < 6 || !requestId) return;
    setBusy(true);
    try {
      const r = await api.verifyCode(requestId, v);
      track("otp_verified", { channel: demoCode ? "demo" : "telegram", is_new: r.isNew });
      setCustomer(r.customer);
      setVerified(true);
      if (r.customer.needsProfile) setStep("profile");
      else {
        setFirst(r.customer.firstName ?? "");
        setLast(r.customer.lastName ?? "");
        setReturning(true);
        setStep("delivery");
        loadSaved();
      }
    } catch (e) {
      const left = e instanceof ApiError ? (e.data.attemptsLeft as number | undefined) : undefined;
      const msg = e instanceof ApiError && e.code === "code_invalid" ? `${t.coWrongCode}${left !== undefined ? " " + t.coAttemptsLeft(left) : ""}` : errorText(e);
      setErrors({ code: msg });
      track("otp_failed", { reason: e instanceof ApiError ? e.code : "network" });
    } finally {
      setBusy(false);
    }
  };

  const birthDate = () => {
    const d = Number(bd.d), m = Number(bd.m), y = Number(bd.y);
    if (!d && !m && !y) return { value: null, ok: true };
    const date = new Date(y, m - 1, d);
    const age = (Date.now() - date.getTime()) / (365.25 * 86400000);
    const ok = !!d && !!m && !!y && date.getDate() === d && age >= 14 && age <= 100;
    return { value: ok ? `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}` : null, ok };
  };

  const saveProfile = async () => {
    const e: Record<string, string> = {};
    if (!first.trim()) e.first = t.coRequired;
    if (!guest) {
      if (!last.trim()) e.last = t.coRequired;
      const b = birthDate();
      if (!b.ok || !b.value) e.birth = t.coBirthInvalid;
      if (!consent) e.consent = t.coRequired;
    }
    setErrors(e);
    Object.keys(e).forEach((f) => track("checkout_error", { field: f }));
    if (Object.keys(e).length) return;
    if (guest) { setStep("delivery"); return; }
    setBusy(true);
    try {
      const r = await api.saveProfile({ firstName: first.trim(), lastName: last.trim(), birthDate: birthDate().value, consent: true, marketing, lang, utm: storedUtm() });
      setCustomer(r.customer);
      track("signup_completed", { marketing_opt_in: marketing });
      setStep("delivery");
    } catch {
      setErrors({ profile: t.coOrderError });
    } finally {
      setBusy(false);
    }
  };

  const place = async () => {
    if (!address.trim() || address.trim().length < 3) { setErrors({ address: t.coRequired }); track("checkout_error", { field: "address" }); return; }
    setBusy(true);
    setErrors({});
    try {
      const r = await api.createOrder({
        items: totals.lines.map((l) => ({ id: l.key, qty: l.qty })),
        promo: promo?.code ?? null,
        city: totals.city,
        address: address.trim(),
        comment: comment.trim() || undefined,
        payment: payMethod,
        samples,
        lang,
        utm: storedUtm(),
        guest: guest ? { phone: phoneDigits, firstName: first.trim() } : undefined,
      });
      track("purchase", { order_id: r.number, value: r.total, discount: totals.discount, creator_code: r.creatorCode, payment: payMethod, city: totals.city, status: r.status });
      setDone({ number: r.number, code: r.creatorCode, status: r.status });
      clearCart();
      if (customer) setCustomer({ ...customer, ordersCount: customer.ordersCount + 1 });
      window.scrollTo({ top: 0 });
    } catch (e) {
      setErrors({ place: t.coOrderError });
      track("checkout_error", { field: "place", reason: e instanceof ApiError ? e.code : "network" });
    } finally {
      setBusy(false);
    }
  };

  const years = Array.from({ length: 80 }, (_, i) => new Date().getFullYear() - 14 - i);
  const stepIndex = { phone: 1, code: 1, profile: 2, delivery: 3 }[step];

  return (
    <div className="wrap pt-6 md:pt-10">
      <h1 className="h-section">{t.coTitle}</h1>
      <div className="mt-6 grid gap-8 md:grid-cols-[1fr_400px] md:gap-12">
        <div className="min-w-0 space-y-4">
          {/* 1. Телефон и код */}
          <StepCard
            n={1}
            title={t.coPhone}
            done={verified || (guest && step !== "phone")}
            active={step === "phone" || step === "code"}
            onEdit={!returning ? () => { setVerified(false); setGuest(false); setStep("phone"); } : undefined}
            summary={<>{fmtPhone(phoneDigits)} {returning && customer?.firstName && <span className="ml-2 text-success">{t.coWelcomeBack(customer.firstName)}</span>}</>}
          >
            {step === "phone" ? (
              <div className="space-y-3">
                <Field label={t.coPhone} id="phone" error={errors.phone}>
                  <input id="phone" type="tel" inputMode="tel" autoComplete="tel" value={fmtPhone(phoneDigits)} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && requestCode()} className={`${inputCls} tabular`} />
                </Field>
                <button type="button" onClick={requestCode} disabled={phoneDigits.length !== 9 || busy} className="flex h-12 w-full items-center justify-center gap-2 rounded-card bg-accent font-semibold text-white transition active:scale-[.98] disabled:opacity-40">
                  {busy ? <Spinner /> : <Icon name="telegram" size={20} />} {t.coGetCode}
                </button>
                <p className="text-[12px] text-muted">{t.coNoTg}</p>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-[14px]">{t.coCodeSent(fmtPhone(phoneDigits))}</p>
                <p className="rounded-xl bg-accent-soft px-3 py-2 text-[13px] text-ink/80">
                  {t.coCodeHint}
                  {demoCode && <><br /><b>Демо-режим:</b> код {demoCode}</>}
                </p>
                <Field label={t.coCode} id="otp" error={errors.code}>
                  <input
                    ref={codeRef}
                    id="otp"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength={6}
                    value={code}
                    disabled={busy}
                    onChange={(e) => checkCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    className={`${inputCls} text-center text-[24px] font-bold tracking-[0.5em] tabular`}
                    placeholder="••••••"
                  />
                </Field>
                <div className="flex flex-wrap justify-between gap-2 text-[14px]">
                  <button type="button" onClick={() => setStep("phone")} className="text-muted underline">{t.coChangePhone}</button>
                  {resendIn > 0 ? <span className="text-muted tabular">{t.coResend(resendIn)}</span> : <button type="button" onClick={requestCode} className="text-accent">{t.coResendNow}</button>}
                </div>
              </div>
            )}
          </StepCard>

          {/* 2. О вас (новые клиенты) или имя для заказа без Telegram */}
          {!returning && (
            <StepCard n={2} title={guest ? t.coGuestName : t.coAboutYou} done={stepIndex > 2} active={step === "profile"} onEdit={() => setStep("profile")} summary={`${first} ${last}`}>
              {guest && (
                <div className="mb-4 rounded-xl bg-surface p-3 text-[14px]">
                  <p className="font-semibold">{t.coNoTgTitle}</p>
                  <p className="text-ink/70">{t.coNoTgText}</p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label={`${t.coFirst} *`} id="first" error={errors.first}>
                  <input id="first" autoComplete="given-name" value={first} onChange={(e) => setFirst(e.target.value)} className={inputCls} />
                </Field>
                {!guest && (
                  <Field label={`${t.coLast} *`} id="last" error={errors.last}>
                    <input id="last" autoComplete="family-name" value={last} onChange={(e) => setLast(e.target.value)} className={inputCls} />
                  </Field>
                )}
                {!guest && (
                  <div className="sm:col-span-2">
                    <Field label={`${t.coBirth} *`} id="bd-d" error={errors.birth} hint={t.coBirthHint}>
                      <div className="grid grid-cols-[1fr_1.6fr_1.2fr] gap-2">
                        <select id="bd-d" aria-label={t.coDay} value={bd.d} onChange={(e) => setBd({ ...bd, d: e.target.value })} className={inputCls}>
                          <option value="">{t.coDay}</option>
                          {Array.from({ length: 31 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}
                        </select>
                        <select id="bd-m" aria-label={t.coMonth} value={bd.m} onChange={(e) => setBd({ ...bd, m: e.target.value })} className={inputCls}>
                          <option value="">{t.coMonth}</option>
                          {t.months.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
                        </select>
                        <select id="bd-y" aria-label={t.coYear} value={bd.y} onChange={(e) => setBd({ ...bd, y: e.target.value })} className={inputCls}>
                          <option value="">{t.coYear}</option>
                          {years.map((y) => <option key={y} value={y}>{y}</option>)}
                        </select>
                      </div>
                    </Field>
                  </div>
                )}
              </div>
              {!guest && (
                <>
                  <label className="mt-4 flex items-start gap-2.5 text-[14px]">
                    <input id="consent" type="checkbox" checked={consent} onChange={(e) => setConsent(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
                    <span>{t.coConsent} <span className="text-accent">*</span>{errors.consent && <span className="block text-[12px] text-warn">{errors.consent}</span>}</span>
                  </label>
                  <label className="mt-2 flex items-start gap-2.5 text-[14px]">
                    <input id="marketing" type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 size-5 shrink-0 accent-[var(--color-accent)]" />
                    {t.coMarketing}
                  </label>
                </>
              )}
              {errors.profile && <p role="alert" className="mt-3 text-[13px] text-warn">{errors.profile}</p>}
              <button type="button" onClick={saveProfile} disabled={busy} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-card bg-accent font-semibold text-white transition active:scale-[.98] disabled:opacity-60">
                {busy && <Spinner />} {t.next}
              </button>
            </StepCard>
          )}

          {/* 3. Доставка и оплата */}
          <StepCard n={returning ? 2 : 3} title={t.coDelivery} done={false} active={step === "delivery"}>
            <div className="space-y-3">
              {saved.length > 0 && (
                <div role="radiogroup" aria-label={t.coAddress} className="space-y-2">
                  {saved.map((a) => (
                    <button key={a.id} type="button" role="radio" aria-checked={addrId === a.id} onClick={() => pickAddress(a)}
                      className={`flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors ${addrId === a.id ? "border-accent bg-accent-soft" : "border-line"}`}>
                      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full border-2 ${addrId === a.id ? "border-accent" : "border-line"}`}>{addrId === a.id && <span className="size-2.5 rounded-full bg-accent" />}</span>
                      <span className="min-w-0 text-[15px]">
                        <b>{a.label || CITIES.find((c) => c.id === a.city)?.[lang]}</b>
                        <span className="block text-[14px] text-ink/75">{CITIES.find((c) => c.id === a.city)?.[lang]}, {a.address}</span>
                        {a.comment && <span className="block text-[13px] text-muted">{a.comment}</span>}
                      </span>
                    </button>
                  ))}
                  <button type="button" role="radio" aria-checked={addrId === "new"} onClick={() => pickAddress("new")}
                    className={`flex h-12 w-full items-center gap-3 rounded-xl border px-3 text-[15px] ${addrId === "new" ? "border-accent bg-accent-soft" : "border-line"}`}>
                    <Icon name="plus" size={18} /> {lang === "ru" ? "Другой адрес" : "Boshqa manzil"}
                  </button>
                </div>
              )}
              {(addrId === "new" || saved.length === 0) && (
                <>
              <Field label={t.coCity} id="co-city">
                <select id="co-city" value={totals.city} onChange={(e) => setCity(e.target.value)} className={inputCls}>
                  {CITIES.map((c) => <option key={c.id} value={c.id}>{c[lang]}</option>)}
                </select>
              </Field>
              <Field label={`${t.coAddress} *`} id="address" error={errors.address}>
                <input id="address" autoComplete="street-address" value={address} onChange={(e) => setAddress(e.target.value)} placeholder={t.coAddressPh} className={inputCls} />
              </Field>
              <Field label={t.coComment} id="comment">
                <input id="comment" value={comment} onChange={(e) => setComment(e.target.value)} className={inputCls} />
              </Field>
              {returning && <p className="text-[12px] text-muted">{lang === "ru" ? "Адрес сохранится в профиле — в следующий раз выберете его одним нажатием." : "Manzil profilda saqlanadi."}</p>}
                </>
              )}
              {errors.address && addrId !== "new" && saved.length > 0 && <p role="alert" className="text-[12px] text-warn">{errors.address}</p>}
              <fieldset>
                <legend className="text-[13px] font-medium text-ink/70">{t.coPayment}</legend>
                <div className="mt-1 grid gap-2 sm:grid-cols-3">
                  {(["click", "payme", "cash"] as const).filter((m) => m !== "cash" || isTashkent).map((m) => (
                    <label key={m} className={`flex h-12 cursor-pointer items-center gap-2 rounded-xl border px-3 text-[15px] transition-colors ${payMethod === m ? "border-accent bg-accent-soft" : "border-line"}`}>
                      <input type="radio" name="pay" value={m} checked={payMethod === m} onChange={() => setPay(m)} className="accent-[var(--color-accent)]" />
                      {m === "click" ? "Click" : m === "payme" ? "Payme" : t.coCash}
                    </label>
                  ))}
                </div>
                {!isTashkent && <p className="mt-2 text-[13px] text-muted">{t.coPrepay}</p>}
              </fieldset>
            </div>
          </StepCard>
        </div>

        <aside className="min-w-0 space-y-4 md:sticky md:top-28 md:self-start">
          <div className="space-y-5 rounded-panel p-5 shadow-float ring-1 ring-line md:p-6">
            <ul className="space-y-3">
              {totals.lines.map(({ key, p, qty }) => (
                <li key={key} className="flex items-center gap-3 text-[14px]">
                  <span className="relative size-12 shrink-0 overflow-hidden rounded-xl bg-surface"><ProductImage p={p} brand={false} /></span>
                  <span className="min-w-0 flex-1"><span className="block truncate">{p.brand} {p.name}</span>{p.variant && <span className="block truncate text-[12px] text-muted">{p.variant.name[lang] || p.variant.name.ru}</span>}</span>
                  <span className="text-muted tabular">×{qty}</span>
                </li>
              ))}
            </ul>
            <PromoField />
            <Summary
              cta={
                <>
                  {errors.place && <p role="alert" className="text-[13px] text-warn">{errors.place}</p>}
                  <button type="button" disabled={step !== "delivery" || busy} onClick={place} className="mt-3 flex h-14 w-full items-center justify-center gap-2 rounded-card bg-accent text-[16px] font-semibold text-white transition active:scale-[.98] disabled:opacity-40">
                    {busy && step === "delivery" && <Spinner />} {t.coPlace}
                  </button>
                </>
              }
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
