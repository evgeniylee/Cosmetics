"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { money } from "@/lib/shop";
import { api } from "@/lib/api";
import { useI18n } from "@/components/I18n";
import { useSession, useShop, useUi } from "@/store/shop";

type Order = Awaited<ReturnType<typeof api.orders>>["orders"][number];

const STATUS: Record<string, { ru: string; uz: string; cls: string }> = {
  new: { ru: "Принят", uz: "Qabul qilindi", cls: "bg-accent-soft text-accent" },
  needs_call: { ru: "Ждёт звонка", uz: "Qo'ng'iroq kutilmoqda", cls: "bg-surface text-ink" },
  confirmed: { ru: "Подтверждён", uz: "Tasdiqlandi", cls: "bg-accent-soft text-accent" },
  shipped: { ru: "В пути", uz: "Yo'lda", cls: "bg-[#e3f1ff] text-[#1f5d99]" },
  delivered: { ru: "Доставлен", uz: "Yetkazildi", cls: "bg-[#e3f5e6] text-success" },
  cancelled: { ru: "Отменён", uz: "Bekor qilindi", cls: "bg-surface text-muted" },
};

export default function AccountPage() {
  const { lang, t } = useI18n();
  const customer = useSession((s) => s.customer);
  const loaded = useSession((s) => s.loaded);
  const setCustomer = useSession((s) => s.setCustomer);
  const add = useShop((s) => s.add);
  const setAdded = useUi((s) => s.setAdded);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [completion, setCompletion] = useState<number | null>(null);
  const ru = lang === "ru";

  useEffect(() => {
    if (!customer) return;
    api.orders().then((r) => setOrders(r.orders)).catch(() => setOrders([]));
    api.me().then((r) => setCompletion(r.completion ?? null)).catch(() => {});
  }, [customer]);

  if (!loaded) return <div className="wrap h-[50vh]" />;
  if (!customer)
    return (
      <div className="wrap max-w-[640px] py-16 text-center">
        <h1 className="h-section">{t.profile}</h1>
        <p className="mt-4 text-ink/70">{ru ? "Вход по номеру телефона и коду из Telegram происходит при оформлении заказа. После него здесь появятся ваши заказы и кнопка «Купить снова»." : "Telefon raqami va Telegram kodi orqali kirish buyurtma berishda amalga oshadi."}</p>
        <Link href={`/${lang}/catalog`} className="mt-6 inline-grid h-12 place-items-center rounded-card bg-accent px-6 font-semibold text-white">{ru ? "В каталог" : "Katalogga"}</Link>
      </div>
    );

  const reorder = (o: Order) => {
    o.items.forEach((i) => add(i.id, i.qty));
    if (o.items[0]) setAdded(o.items[0].id);
  };

  return (
    <div className="wrap max-w-[860px] py-10">
      <div className="flex flex-wrap items-end gap-3">
        <h1 className="h-section">{customer.firstName} {customer.lastName}</h1>
        <button
          type="button"
          onClick={async () => { await api.logout().catch(() => {}); setCustomer(null); }}
          className="ml-auto h-10 rounded-full bg-surface px-4 text-[14px] hover:bg-line"
        >
          {t.logout}
        </button>
      </div>
      <p className="mt-2 text-ink/70 tabular">{customer.phone.replace(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/, "+998 $1 $2 $3 $4")}</p>

      {completion !== null && completion < 100 && (
        <div className="mt-6 rounded-panel bg-accent-soft p-5">
          <div className="flex items-center justify-between gap-3">
            <p className="font-semibold">{ru ? `Профиль заполнен на ${completion}%` : `Profil ${completion}% to'ldirilgan`}</p>
          </div>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
            <div className="h-full rounded-full bg-accent transition-all duration-700" style={{ width: `${completion}%` }} />
          </div>
          <p className="mt-2 text-[14px] text-ink/75">{ru ? "Расскажите о своей коже, подберём уход и дадим 15 000 сум на следующий заказ. Анкета появится после первой доставки." : "Teringiz haqida aytib bering va keyingi buyurtmaga 15 000 so'm oling."}</p>
        </div>
      )}

      <h2 className="mt-10 text-[24px] font-bold">{ru ? "Заказы" : "Buyurtmalar"}</h2>
      {orders === null ? (
        <div className="mt-4 space-y-3">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-card bg-surface" />)}</div>
      ) : orders.length === 0 ? (
        <p className="mt-3 text-ink/70">{ru ? "Заказов пока нет." : "Hozircha buyurtmalar yo'q."}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((o) => {
            const st = STATUS[o.status] ?? STATUS.new;
            return (
              <li key={o.id} className="rounded-card border border-line p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-semibold">{o.number}</span>
                  <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${st.cls}`}>{st[lang]}</span>
                  <span className="text-[13px] text-muted">{new Date(o.created_at).toLocaleDateString(ru ? "ru-RU" : "uz-UZ")}</span>
                  <span className="ml-auto font-bold tabular">{money(o.total, lang)}</span>
                </div>
                <p className="mt-1 text-[14px] text-ink/70">{o.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}</p>
                <button type="button" onClick={() => reorder(o)} className="mt-3 h-10 rounded-full bg-ink px-4 text-[14px] font-semibold text-white transition active:scale-95">
                  {ru ? "Купить снова" : "Yana sotib olish"}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
