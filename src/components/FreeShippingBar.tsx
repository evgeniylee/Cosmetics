"use client";
import { FREE_FROM, money } from "@/lib/shop";
import { useCartTotals } from "@/lib/useCart";
import { useI18n } from "./I18n";
import { Icon } from "./Icon";

export function FreeShippingBar() {
  const { lang, t } = useI18n();
  const { afterDiscount, city } = useCartTotals();
  if (city !== "tashkent") return null;
  const left = Math.max(0, FREE_FROM - afterDiscount);
  const pct = Math.min(100, (afterDiscount / FREE_FROM) * 100);
  return (
    <div className="rounded-xl bg-surface p-3">
      <p className="flex items-center gap-2 text-[13px]">
        <Icon name="truck" size={18} className={left ? "text-ink" : "text-success"} />
        {left ? t.toFree(money(left, lang)) : <span className="font-semibold text-success">{t.freeReached}</span>}
      </p>
      <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-line">
        <div className={`h-full rounded-full transition-all ${left ? "bg-accent" : "bg-success"}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
