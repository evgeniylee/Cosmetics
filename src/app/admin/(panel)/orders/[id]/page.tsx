import Link from "next/link";
import { notFound } from "next/navigation";
import { many, one } from "@/server/db";
import { PAYMENT_LABEL, STATUS_META, fmtDate, fmtPhone, fmtSum, type OrderStatus } from "@/lib/admin-format";
import { CITIES } from "@/lib/shop";
import { SAMPLES } from "@/data/catalog";
import { Card, PageHead } from "../../ui";
import { OrderControls } from "./controls";
import { AttributionControl } from "./attribution";
import { COMMISSION_STATE, STATE_LABEL } from "@/server/creators";

type Order = {
  id: string; number: string; status: OrderStatus; customer_id: string | null; phone: string; first_name: string | null; last_name: string | null;
  city: string; address: string; comment: string | null; payment: string; subtotal: string; discount: string; discount_source: string | null;
  delivery: string; total: string; promo_code: string | null; samples: string[] | null; utm: Record<string, string> | null; lang: string;
  manager_note: string | null; paid_at: string | null; created_at: string;
  creator_code: string | null; attribution: string | null; link_id: string | null; commission: string; commission_rate: number | null; commission_note: string | null;
  new_customer: boolean; state: string | null; commission_available_at: string | null;
};

export default async function OrderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();
  const o = await one<Order>(`SELECT o.*, ${COMMISSION_STATE} AS state FROM orders o WHERE o.id = $1`, [id]);
  if (!o) notFound();
  const items = await many<{ product_id: string; variant_id: string | null; name: string; price: string; cost: string | null; qty: number; slug: string | null }>(
    `SELECT oi.product_id, oi.variant_id, oi.name, oi.price, oi.cost, oi.qty, p.slug FROM order_items oi LEFT JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1`,
    [id]
  );
  const log = await many<{ from_status: string | null; to_status: OrderStatus; by_phone: string | null; created_at: string }>(
    `SELECT from_status, to_status, by_phone, created_at FROM order_status_log WHERE order_id = $1 ORDER BY created_at DESC`,
    [id]
  );
  const creators = await many<{ code: string; name: string }>(`SELECT code, creator_name AS name FROM promo_codes ORDER BY creator_name`);
  const linkLabel = o.link_id ? (await one<{ label: string }>(`SELECT label FROM creator_links WHERE id = $1`, [o.link_id]))?.label ?? null : null;
  const attrLog = await many<{ from_code: string | null; to_code: string | null; reason: string; by_phone: string | null; created_at: string }>(
    `SELECT from_code, to_code, reason, by_phone, created_at FROM attribution_log WHERE order_id = $1 ORDER BY created_at DESC`, [id]);
  const customer = o.customer_id ? await one<{ orders_count: number; total_spent: string }>(`SELECT orders_count, total_spent FROM customers WHERE id = $1`, [o.customer_id]) : null;

  const costed = items.every((i) => i.cost != null);
  const cost = items.reduce((a, i) => a + Number(i.cost ?? 0) * i.qty, 0);
  const profit = Number(o.subtotal) - Number(o.discount) - cost;
  const city = CITIES.find((c) => c.id === o.city)?.ru ?? o.city;
  const name = [o.first_name, o.last_name].filter(Boolean).join(" ") || "—";
  const source = o.utm ? [o.utm.utm_source, o.utm.utm_campaign, o.utm.ref && `ref=${o.utm.ref}`].filter(Boolean).join(" · ") : "";
  const tel = o.phone.replace(/[^\d+]/g, "");

  return (
    <>
      <PageHead title={`Заказ ${o.number}`} sub={`${fmtDate(o.created_at)} · ${o.lang === "uz" ? "узбекский" : "русский"} интерфейс`}>
        <Link href="/admin/orders" className="text-[14px] text-muted">← Все заказы</Link>
      </PageHead>
      <div className="grid gap-4 px-4 md:px-8 lg:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <Card>
            <div className="flex flex-wrap items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-[18px] font-bold">{name}</p>
                <p className="mt-0.5 tabular"><span className="select-all">{fmtPhone(o.phone)}</span></p>
                {customer && (
                  <Link href={`/admin/customers/${o.customer_id}`} className="mt-1 inline-block text-[13px] text-accent">
                    Карточка клиента · {customer.orders_count} зак. на {fmtSum(customer.total_spent)}
                  </Link>
                )}
                {!o.customer_id && <p className="mt-1 text-[13px] text-[#9a5b00]">Номер не подтверждён: позвоните и подтвердите заказ</p>}
              </div>
              <div className="flex w-full gap-2 sm:w-auto">
                <a href={`tel:${tel}`} className="h-10 flex-1 rounded-full bg-ink px-4 text-center text-[14px] font-semibold leading-10 text-white sm:flex-none">Позвонить</a>
                <a href={`https://t.me/${tel}`} target="_blank" rel="noreferrer" className="h-10 flex-1 rounded-full bg-surface px-4 text-center text-[14px] leading-10 sm:flex-none">Telegram</a>
              </div>
            </div>
            <dl className="mt-4 grid gap-x-6 gap-y-2 border-t border-line pt-4 text-[14px] sm:grid-cols-[120px_1fr]">
              <dt className="text-muted">Доставка</dt><dd><span className="select-all">{city}, {o.address}</span></dd>
              {o.comment && (<><dt className="text-muted">Комментарий</dt><dd>{o.comment}</dd></>)}
              <dt className="text-muted">Оплата</dt><dd>{PAYMENT_LABEL[o.payment] ?? o.payment} · {o.paid_at ? <span className="text-success">оплачено {fmtDate(o.paid_at)}</span> : "не оплачено"}</dd>
              {o.promo_code && (<><dt className="text-muted">Промокод</dt><dd className="text-accent">{o.promo_code}</dd></>)}
              {source && (<><dt className="text-muted">Источник</dt><dd className="text-[13px]">{source}</dd></>)}
            </dl>
          </Card>

          <Card>
            <h2 className="font-bold">Состав заказа</h2>
            <ul className="mt-2 divide-y divide-line text-[14px]">
              {items.map((i) => (
                <li key={`${i.product_id}~${i.variant_id ?? ""}`} className="flex gap-3 py-2.5">
                  <span className="min-w-0 flex-1">
                    {i.slug ? <Link href={`/admin/products/${i.product_id}`} className="hover:text-accent">{i.name}</Link> : i.name}
                    <span className="block text-[12px] text-muted tabular">{fmtSum(i.price)} × {i.qty}{i.cost != null && ` · себестоимость ${fmtSum(i.cost)}`}</span>
                  </span>
                  <span className="font-semibold tabular">{fmtSum(Number(i.price) * i.qty)}</span>
                </li>
              ))}
            </ul>
            {(o.samples?.length ?? 0) > 0 && <p className="mt-2 rounded-xl bg-accent-soft px-3 py-2 text-[13px]">🎁 Пробники: {o.samples!.map((s) => SAMPLES.find((x) => x.id === s)?.name.ru ?? s).join(", ")}</p>}
            <dl className="mt-3 space-y-1 border-t border-line pt-3 text-[14px] tabular">
              <div className="flex justify-between"><dt>Товары</dt><dd>{fmtSum(o.subtotal)}</dd></div>
              {Number(o.discount) > 0 && <div className="flex justify-between text-success"><dt>Скидка {o.discount_source}</dt><dd>−{fmtSum(o.discount)}</dd></div>}
              <div className="flex justify-between"><dt>Доставка</dt><dd>{Number(o.delivery) ? fmtSum(o.delivery) : "бесплатно"}</dd></div>
              <div className="flex justify-between text-[17px] font-bold"><dt>Итого</dt><dd>{fmtSum(o.total)}</dd></div>
              <div className="flex justify-between text-muted"><dt>Прибыль с товаров</dt><dd>{costed ? `${fmtSum(profit)} · ${Math.round((profit / Number(o.subtotal)) * 100)}%` : "нет себестоимости"}</dd></div>
            </dl>
          </Card>
        </div>

        <div className="space-y-4">
          <OrderControls id={o.id} status={o.status} paid={!!o.paid_at} note={o.manager_note ?? ""} />
          <Card>
            <h2 className="font-bold">Креатор</h2>
            {o.creator_code ? (
              <div className="mt-2 space-y-1 text-[14px]">
                <p><Link href={`/admin/promo/${o.creator_code}`} className="font-semibold text-accent">{o.creator_code}</Link> · {{ code: "ввёл код", link: "по ссылке", repeat: "клиент креатора (60 дней)", manual: "назначен вручную" }[o.attribution ?? ""] ?? o.attribution}{linkLabel ? ` «${linkLabel}»` : ""}{o.new_customer ? " · новый клиент" : ""}</p>
                <p className="tabular">Комиссия {o.commission_rate ?? 0}%: <b>{fmtSum(o.commission)}</b> · {o.state ? (o.state === "hold" && o.commission_available_at ? `подтвердится ${fmtDate(o.commission_available_at, false)}` : STATE_LABEL[o.state] ?? o.state) : "—"}</p>
                {o.commission_note && <p className="text-[13px] text-warn">{o.commission_note}</p>}
              </div>
            ) : <p className="mt-2 text-[14px] text-muted">Заказ не связан с креатором</p>}
            <AttributionControl id={o.id} current={o.creator_code} creators={creators} locked={o.state === "paid" || o.state === "clawed"} />
            {attrLog.length > 0 && (
              <ul className="mt-3 space-y-1 border-t border-line pt-3 text-[12px] text-muted">
                {attrLog.map((l, i) => <li key={i}>{fmtDate(l.created_at)}: {l.from_code ?? "—"} → {l.to_code ?? "—"} · {l.reason}{l.by_phone ? ` · ${fmtPhone(l.by_phone)}` : ""}</li>)}
              </ul>
            )}
          </Card>
          <Card>
            <h2 className="font-bold">История</h2>
            <ol className="mt-2 space-y-2 text-[13px]">
              {log.map((l, i) => (
                <li key={i} className="flex gap-2">
                  <span className={`mt-1.5 size-2 shrink-0 rounded-full ${STATUS_META[l.to_status]?.dot ?? "bg-muted"}`} />
                  <span>{STATUS_META[l.to_status]?.label ?? l.to_status}<span className="block text-muted tabular">{fmtDate(l.created_at)}{l.by_phone ? ` · ${fmtPhone(l.by_phone)}` : ""}</span></span>
                </li>
              ))}
              <li className="flex gap-2"><span className="mt-1.5 size-2 shrink-0 rounded-full bg-line" /><span>Заказ создан<span className="block text-muted tabular">{fmtDate(o.created_at)}</span></span></li>
            </ol>
          </Card>
        </div>
      </div>
    </>
  );
}
