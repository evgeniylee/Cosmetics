"use client";
// Обёртка страниц профиля: гость сразу видит вход прямо на странице, без лишнего клика.
import Link from "next/link";
import type { ApiCustomer } from "@/lib/api";
import { useSession } from "@/store/shop";
import { AuthFlow } from "./Auth";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";

export function AccountGate({ children }: { children: (c: ApiCustomer) => React.ReactNode }) {
  const { lang, t } = useI18n();
  const customer = useSession((s) => s.customer);
  const loaded = useSession((s) => s.loaded);
  const ru = lang === "ru";
  if (!loaded) return <div className="wrap h-[60vh]" />;
  if (!customer || customer.needsProfile)
    return (
      <div className="wrap max-w-[460px] py-8 md:py-14">
        <h1 className="h-section">{t.profile}</h1>
        <ul className="mt-4 space-y-2 text-[15px] text-ink/80">
          {(ru
            ? ["Статусы заказов и «Купить снова» в одно нажатие", "Сохранённые адреса — заказ за полминуты", "Корзина и избранное на всех устройствах"]
            : ["Buyurtma holati va bir bosishda «Yana sotib olish»", "Saqlangan manzillar — yarim daqiqada buyurtma", "Savat va sevimlilar barcha qurilmalarda"]
          ).map((x) => (
            <li key={x} className="flex gap-2"><span className="mt-0.5 text-success"><Icon name="check" size={18} /></span>{x}</li>
          ))}
        </ul>
        <div className="mt-6 rounded-panel p-5 shadow-float ring-1 ring-line"><AuthFlow onDone={() => {}} /></div>
        <p className="mt-4 text-center text-[14px] text-muted">
          <Link href={`/${lang}/catalog`} className="underline">{ru ? "Продолжить без входа" : "Kirmasdan davom etish"}</Link>
        </p>
      </div>
    );
  return <>{children(customer)}</>;
}

export const fmtPhoneUz = (p: string) => p.replace(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/, "+998 $1 $2 $3 $4");

export const ORDER_STATUS: Record<string, { ru: string; uz: string; cls: string }> = {
  new: { ru: "Принят", uz: "Qabul qilindi", cls: "bg-accent-soft text-accent" },
  needs_call: { ru: "Ждёт звонка", uz: "Qo'ng'iroq kutilmoqda", cls: "bg-surface text-ink" },
  confirmed: { ru: "Подтверждён", uz: "Tasdiqlandi", cls: "bg-accent-soft text-accent" },
  shipped: { ru: "В пути", uz: "Yo'lda", cls: "bg-[#e3f1ff] text-[#1f5d99]" },
  delivered: { ru: "Доставлен", uz: "Yetkazildi", cls: "bg-[#e3f5e6] text-success" },
  cancelled: { ru: "Отменён", uz: "Bekor qilindi", cls: "bg-surface text-muted" },
};
