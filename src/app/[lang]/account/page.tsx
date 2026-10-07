"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { money } from "@/lib/shop";
import { api } from "@/lib/api";
import { useI18n } from "@/components/I18n";
import { Icon } from "@/components/Icon";
import { AccountGate, ORDER_STATUS, fmtPhoneUz } from "@/components/AccountGate";
import { logoutEverywhere } from "@/components/Auth";
import { useShop, useUi } from "@/store/shop";

type Order = Awaited<ReturnType<typeof api.orders>>["orders"][number];

export default function AccountPage() {
  return <AccountGate>{(c) => <Overview name={`${c.firstName ?? ""} ${c.lastName ?? ""}`.trim()} phone={c.phone} />}</AccountGate>;
}

function Overview({ name, phone }: { name: string; phone: string }) {
  const { lang } = useI18n();
  const ru = lang === "ru";
  const add = useShop((s) => s.add);
  const favCount = useShop((s) => s.favorites.length);
  const setAdded = useUi((s) => s.setAdded);
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [addrCount, setAddrCount] = useState<number | null>(null);
  const [completion, setCompletion] = useState<number | null>(null);

  useEffect(() => {
    api.orders().then((r) => setOrders(r.orders)).catch(() => setOrders([]));
    api.addresses().then((r) => setAddrCount(r.addresses.length)).catch(() => {});
    api.me().then((r) => setCompletion(r.completion ?? null)).catch(() => {});
  }, []);

  const reorder = (o: Order) => {
    o.items.forEach((i) => add(i.id, i.qty));
    if (o.items[0]) setAdded(o.items[0].id);
  };
  const active = orders?.filter((o) => ["new", "needs_call", "confirmed", "shipped"].includes(o.status)) ?? [];

  const tiles = [
    { href: `/${lang}/account/addresses`, icon: "pin", label: ru ? "Адреса" : "Manzillar", sub: addrCount === null ? "" : addrCount ? `${addrCount}` : ru ? "добавить" : "qo'shish" },
    { href: `/${lang}/catalog?fav=1`, icon: "heart", label: ru ? "Избранное" : "Sevimlilar", sub: String(favCount) },
    { href: `/${lang}/account/profile`, icon: "user", label: ru ? "Мои данные" : "Ma'lumotlarim", sub: ru ? "имя, язык, рассылка" : "ism, til" },
  ];

  return (
    <div className="wrap max-w-[860px] py-6 md:py-10">
      <div className="flex items-center gap-4">
        <span className="grid size-14 shrink-0 place-items-center rounded-full bg-accent text-[22px] font-bold text-white">{(name || "?").slice(0, 1).toUpperCase()}</span>
        <div className="min-w-0">
          <h1 className="truncate text-[26px] font-bold leading-tight md:text-[32px]">{name}</h1>
          <p className="text-ink/70 tabular">{fmtPhoneUz(phone)}</p>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-2 md:gap-3">
        {tiles.map((t) => (
          <Link key={t.href} href={t.href} className="rounded-card bg-surface p-3 transition-colors hover:bg-line md:p-4">
            <Icon name={t.icon} size={22} className="text-accent" />
            <p className="mt-2 text-[14px] font-semibold leading-tight md:text-[15px]">{t.label}</p>
            <p className="text-[12px] text-muted">{t.sub}</p>
          </Link>
        ))}
      </div>

      {completion !== null && completion < 100 && (
        <div className="mt-4 rounded-panel bg-accent-soft p-4">
          <p className="text-[14px] font-semibold">{ru ? `Профиль заполнен на ${completion}%` : `Profil ${completion}% to'ldirilgan`}</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white"><div className="h-full rounded-full bg-accent" style={{ width: `${completion}%` }} /></div>
          <p className="mt-2 text-[13px] text-ink/75">{ru ? "После первой доставки спросим о вашей коже — подберём уход и дадим 15 000 сум на следующий заказ." : "Birinchi yetkazishdan so'ng teringiz haqida so'raymiz va keyingi buyurtmaga 15 000 so'm beramiz."}</p>
        </div>
      )}

      <h2 className="mt-8 text-[22px] font-bold">{ru ? "Заказы" : "Buyurtmalar"}{active.length > 0 && <span className="ml-2 text-[15px] font-medium text-accent">{ru ? `${active.length} в работе` : `${active.length} jarayonda`}</span>}</h2>
      {orders === null ? (
        <div className="mt-3 space-y-3">{[0, 1].map((i) => <div key={i} className="h-24 animate-pulse rounded-card bg-surface" />)}</div>
      ) : orders.length === 0 ? (
        <div className="mt-3 rounded-card bg-surface p-5 text-center">
          <p className="text-ink/70">{ru ? "Заказов пока нет." : "Hozircha buyurtmalar yo'q."}</p>
          <Link href={`/${lang}/catalog`} className="mt-3 inline-grid h-11 place-items-center rounded-full bg-accent px-5 font-semibold text-white">{ru ? "В каталог" : "Katalogga"}</Link>
        </div>
      ) : (
        <ul className="mt-3 space-y-3">
          {orders.map((o) => {
            const st = ORDER_STATUS[o.status] ?? ORDER_STATUS.new;
            return (
              <li key={o.id} className="rounded-card border border-line">
                <Link href={`/${lang}/account/orders/${o.number}`} className="block p-4 pb-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold tabular">{o.number}</span>
                    <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${st.cls}`}>{st[lang]}</span>
                    <span className="text-[13px] text-muted">{new Date(o.created_at).toLocaleDateString(ru ? "ru-RU" : "uz-UZ")}</span>
                    <span className="ml-auto font-bold tabular">{money(o.total, lang)}</span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-[14px] text-ink/70">{o.items.map((i) => `${i.name}${i.qty > 1 ? ` ×${i.qty}` : ""}`).join(", ")}</p>
                </Link>
                <div className="flex items-center gap-3 px-4 pb-4 pt-1">
                  <button type="button" onClick={() => reorder(o)} className="h-10 rounded-full bg-ink px-4 text-[14px] font-semibold text-white transition active:scale-95">{ru ? "Купить снова" : "Yana sotib olish"}</button>
                  <Link href={`/${lang}/account/orders/${o.number}`} className="text-[14px] text-accent">{ru ? "Подробнее →" : "Batafsil →"}</Link>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 flex flex-wrap gap-x-6 gap-y-2 border-t border-line pt-5 text-[14px]">
        <button type="button" onClick={() => logoutEverywhere(false)} className="text-ink/80 underline">{ru ? "Выйти" : "Chiqish"}</button>
        <button type="button" onClick={() => logoutEverywhere(true)} className="text-muted underline">{ru ? "Выйти на всех устройствах" : "Barcha qurilmalardan chiqish"}</button>
      </div>
    </div>
  );
}
