export const ORDER_STATUSES = ["new", "needs_call", "confirmed", "shipped", "delivered", "cancelled"] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export const STATUS_META: Record<OrderStatus, { label: string; cls: string; dot: string }> = {
  new: { label: "Новый", cls: "bg-accent-soft text-accent", dot: "bg-accent" },
  needs_call: { label: "Требует звонка", cls: "bg-[#fff1d6] text-[#9a5b00]", dot: "bg-[#e19a1f]" },
  confirmed: { label: "Подтверждён", cls: "bg-[#e6eefc] text-[#2453a6]", dot: "bg-[#3b6fd1]" },
  shipped: { label: "В пути", cls: "bg-[#ece6fb] text-[#5b3aa8]", dot: "bg-[#7b57d1]" },
  delivered: { label: "Доставлен", cls: "bg-[#e3f5e6] text-[#2f7a3a]", dot: "bg-success" },
  cancelled: { label: "Отменён", cls: "bg-surface text-muted", dot: "bg-muted" },
};

export const PAYMENT_LABEL: Record<string, string> = { click: "Click", payme: "Payme", cash: "Наличными" };
export const STOCK_META: Record<string, { label: string; cls: string }> = {
  in_stock: { label: "В наличии", cls: "bg-[#e3f5e6] text-[#2f7a3a]" },
  on_order: { label: "Под заказ", cls: "bg-[#fff1d6] text-[#9a5b00]" },
  out: { label: "Нет", cls: "bg-surface text-muted" },
};

export const fmtSum = (n: number | string | null | undefined) =>
  n == null ? "—" : Math.round(Number(n)).toString().replace(/\B(?=(\d{3})+(?!\d))/g, " ") + " сум";

export const fmtPhone = (p: string) => p.replace(/^\+998(\d{2})(\d{3})(\d{2})(\d{2})$/, "+998 $1 $2 $3 $4");

export const fmtDate = (d: string | Date, withTime = true) =>
  new Date(d).toLocaleString("ru-RU", { timeZone: "Asia/Tashkent", day: "2-digit", month: "2-digit", year: withTime ? undefined : "numeric", ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}) });
