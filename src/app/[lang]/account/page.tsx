"use client";
import Link from "next/link";
import { getById } from "@/data/catalog";
import { money } from "@/lib/shop";
import { useI18n } from "@/components/I18n";
import { useHydrated, useShop } from "@/store/shop";

export default function AccountPage() {
  const { lang } = useI18n();
  const hydrated = useHydrated();
  const customer = useShop((s) => s.customer);
  const orders = useShop((s) => s.orders);
  const ru = lang === "ru";
  if (!hydrated) return <div className="wrap h-[50vh]" />;
  if (!customer)
    return (
      <div className="wrap max-w-[640px] py-16 text-center">
        <h1 className="h-section">{ru ? "Профиль" : "Profil"}</h1>
        <p className="mt-4 text-ink/70">{ru ? "Вход по номеру телефона и коду из Telegram происходит при первом заказе. После него здесь появятся ваши заказы и кнопка «Купить снова»." : "Telefon raqami va Telegram kodi orqali kirish birinchi buyurtmada amalga oshadi."}</p>
        <Link href={`/${lang}/catalog`} className="mt-6 inline-grid h-12 place-items-center rounded-card bg-accent px-6 font-semibold text-white">{ru ? "В каталог" : "Katalogga"}</Link>
      </div>
    );
  return (
    <div className="wrap max-w-[860px] py-10">
      <h1 className="h-section">{customer.firstName} {customer.lastName}</h1>
      <p className="mt-2 text-ink/70 tabular">{customer.phone}</p>
      <div className="mt-6 rounded-panel bg-accent-soft p-5">
        <p className="font-semibold">{ru ? "Профиль заполнен на 40%" : "Profil 40% to'ldirilgan"}</p>
        <p className="mt-1 text-[14px] text-ink/75">{ru ? "Расскажите о своей коже, подберём уход и дадим 15 000 сум на следующий заказ." : "Teringiz haqida aytib bering va keyingi buyurtmaga 15 000 so'm oling."}</p>
      </div>
      <h2 className="mt-10 text-[24px] font-bold">{ru ? "Заказы" : "Buyurtmalar"}</h2>
      {orders.length === 0 ? (
        <p className="mt-3 text-ink/70">{ru ? "Заказов пока нет." : "Hozircha buyurtmalar yo'q."}</p>
      ) : (
        <ul className="mt-4 space-y-3">
          {orders.map((o) => (
            <li key={o.id} className="rounded-card border border-line p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold">{o.id}</span>
                <span className="text-[13px] text-muted">{new Date(o.createdAt).toLocaleDateString(ru ? "ru-RU" : "uz-UZ")}</span>
                <span className="ml-auto font-bold tabular">{money(o.total, lang)}</span>
              </div>
              <p className="mt-1 text-[14px] text-ink/70">{o.items.map((i) => getById(i.id)?.brand).join(", ")}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
