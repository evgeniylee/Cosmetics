"use client";
import Link from "next/link";
import { use, useEffect, useState } from "react";
import { CITIES, SUPPORT_URL, money } from "@/lib/shop";
import { api, type ApiOrderDetail } from "@/lib/api";
import { SAMPLES, type Pack } from "@/data/catalog";
import { useI18n } from "@/components/I18n";
import { Icon } from "@/components/Icon";
import { ProductImage } from "@/components/ProductVisual";
import { AccountGate, ORDER_STATUS } from "@/components/AccountGate";
import { useShop, useUi } from "@/store/shop";
import { cartKey } from "@/lib/variants";

const STEPS = ["new", "confirmed", "shipped", "delivered"] as const;
const PAY: Record<string, { ru: string; uz: string }> = { click: { ru: "Click", uz: "Click" }, payme: { ru: "Payme", uz: "Payme" }, cash: { ru: "Наличными курьеру", uz: "Kuryerga naqd" } };

export default function OrderPage({ params }: { params: Promise<{ number: string }> }) {
  const { number } = use(params);
  return <AccountGate>{() => <Detail number={number} />}</AccountGate>;
}

function Detail({ number }: { number: string }) {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const [d, setD] = useState<ApiOrderDetail | null | "missing">(null);
  const add = useShop((s) => s.add);
  const setAdded = useUi((s) => s.setAdded);
  useEffect(() => { api.order(number).then(setD).catch(() => setD("missing")); }, [number]);

  if (d === null) return <div className="wrap max-w-[760px] py-10"><div className="h-64 animate-pulse rounded-panel bg-surface" /></div>;
  if (d === "missing")
    return (
      <div className="wrap max-w-[760px] py-16 text-center">
        <p className="text-ink/70">{ru ? "Заказ не найден в вашем аккаунте." : "Buyurtma topilmadi."}</p>
        <Link href={`/${lang}/account`} className="mt-4 inline-block text-accent">{ru ? "← Все заказы" : "← Barcha buyurtmalar"}</Link>
      </div>
    );

  const { order: o, items, log } = d;
  const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.new;
  const cancelled = o.status === "cancelled";
  const stepNow = STEPS.indexOf((o.status === "needs_call" ? "new" : o.status) as (typeof STEPS)[number]);
  const when = (s: string) => {
    const hit = s === "new" ? o.created_at : log.filter((l) => l.to_status === s).at(-1)?.created_at;
    return hit ? new Date(hit).toLocaleString(ru ? "ru-RU" : "uz-UZ", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" }) : null;
  };
  const label: Record<string, { ru: string; uz: string }> = {
    new: { ru: "Принят", uz: "Qabul qilindi" }, confirmed: { ru: "Подтверждён", uz: "Tasdiqlandi" }, shipped: { ru: "Передан курьеру", uz: "Kuryerga berildi" }, delivered: { ru: "Доставлен", uz: "Yetkazildi" },
  };
  const reorder = () => {
    const live = items.filter((i) => i.active);
    live.forEach((i) => add(cartKey(i.product_id, i.variant_id), i.qty));
    if (live[0]) setAdded(cartKey(live[0].product_id, live[0].variant_id));
  };
  const city = CITIES.find((c) => c.id === o.city)?.[lang] ?? o.city;

  return (
    <div className="wrap max-w-[760px] py-6 md:py-10">
      <Link href={`/${lang}/account`} className="text-[14px] text-muted">{ru ? "← Все заказы" : "← Barcha buyurtmalar"}</Link>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <h1 className="text-[28px] font-bold tabular">{ru ? "Заказ" : "Buyurtma"} {o.number}</h1>
        <span className={`rounded-full px-3 py-1 text-[13px] font-medium ${st.cls}`}>{st[lang]}</span>
      </div>
      <p className="text-[14px] text-muted">{new Date(o.created_at).toLocaleString(ru ? "ru-RU" : "uz-UZ", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit", timeZone: "Asia/Tashkent" })}</p>

      {/* Этапы заказа */}
      {cancelled ? (
        <p className="mt-5 rounded-card bg-surface p-4 text-[14px]">{ru ? "Заказ отменён. Если это ошибка — напишите нам, разберёмся." : "Buyurtma bekor qilindi. Xato bo'lsa — bizga yozing."}</p>
      ) : (
        <ol className="mt-5 grid grid-cols-4 gap-1">
          {STEPS.map((s, i) => {
            const done = i <= stepNow;
            return (
              <li key={s} className="min-w-0">
                <div className={`h-1.5 rounded-full ${done ? "bg-accent" : "bg-line"}`} />
                <p className={`mt-2 text-[12px] font-semibold leading-tight md:text-[13px] ${done ? "" : "text-muted"}`}>{label[s][lang]}</p>
                {done && when(s) && <p className="text-[11px] text-muted">{when(s)}</p>}
              </li>
            );
          })}
        </ol>
      )}
      {o.status === "needs_call" && <p className="mt-3 text-[13px] text-ink/70">{ru ? "Менеджер позвонит, чтобы подтвердить заказ." : "Menejer buyurtmani tasdiqlash uchun qo'ng'iroq qiladi."}</p>}

      <ul className="mt-6 divide-y divide-line rounded-panel border border-line">
        {items.map((i) => {
          const inner = (
            <>
              <span className="grid size-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-surface p-1">
                <ProductImage p={{ images: i.images ?? [], pack: (i.pack ?? "bottle") as Pack, color: i.color ?? "#EADFD3", brand: i.brand ?? "" }} brand={false} />
              </span>
              <span className="min-w-0 flex-1">
                <span className="line-clamp-2 text-[15px]">{i.name}</span>
                <span className="text-[13px] text-muted tabular">{money(i.price, lang)} × {i.qty}</span>
              </span>
              <span className="font-semibold tabular">{money(i.price * i.qty, lang)}</span>
            </>
          );
          return (
            <li key={cartKey(i.product_id, i.variant_id)}>
              {i.slug && i.active ? <Link href={`/${lang}/p/${i.slug}`} className="flex items-center gap-3 p-3 hover:bg-surface/60">{inner}</Link> : <div className="flex items-center gap-3 p-3">{inner}</div>}
            </li>
          );
        })}
      </ul>
      {(o.samples?.length ?? 0) > 0 && <p className="mt-2 text-[13px] text-ink/70">🎁 {ru ? "Пробники" : "Namunalar"}: {o.samples!.map((s) => SAMPLES.find((x) => x.id === s)?.name[lang] ?? s).join(", ")}</p>}

      <dl className="mt-5 space-y-1.5 text-[15px] tabular">
        <div className="flex justify-between"><dt className="text-ink/70">{ru ? "Товары" : "Mahsulotlar"}</dt><dd>{money(o.subtotal, lang)}</dd></div>
        {o.discount > 0 && <div className="flex justify-between text-success"><dt>{ru ? "Скидка" : "Chegirma"} {o.discount_source}</dt><dd>−{money(o.discount, lang)}</dd></div>}
        <div className="flex justify-between"><dt className="text-ink/70">{ru ? "Доставка" : "Yetkazib berish"}</dt><dd>{o.delivery ? money(o.delivery, lang) : ru ? "бесплатно" : "bepul"}</dd></div>
        <div className="flex justify-between text-[18px] font-bold"><dt>{ru ? "Итого" : "Jami"}</dt><dd>{money(o.total, lang)}</dd></div>
      </dl>

      <div className="mt-5 grid gap-3 rounded-panel bg-surface p-4 text-[14px] sm:grid-cols-2">
        <div><p className="text-muted">{ru ? "Адрес" : "Manzil"}</p><p>{city}, {o.address}</p>{o.comment && <p className="text-ink/70">{o.comment}</p>}</div>
        <div><p className="text-muted">{ru ? "Оплата" : "To'lov"}</p><p>{PAY[o.payment]?.[lang] ?? o.payment}{o.paid_at ? (ru ? " · оплачено" : " · to'langan") : ""}</p></div>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={reorder} className="h-12 rounded-card bg-accent px-6 font-semibold text-white transition active:scale-[.98]">{ru ? "Купить снова" : "Yana sotib olish"}</button>
        <a href={SUPPORT_URL} target="_blank" rel="noreferrer" className="flex h-12 items-center gap-2 rounded-card bg-surface px-5 font-semibold"><Icon name="telegram" size={18} /> {ru ? "Вопрос по заказу" : "Buyurtma bo'yicha savol"}</a>
      </div>
    </div>
  );
}
