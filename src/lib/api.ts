"use client";
// Клиент для API магазина. Все запросы идут на свой сервер, куки сессии ставит сервер.

export type ApiCustomer = {
  id: string;
  phone: string;
  firstName: string | null;
  lastName: string | null;
  birthDate: string | null;
  marketing: boolean;
  city: string | null;
  ordersCount: number;
  lang: string;
  needsProfile: boolean;
};

export type ApiAddress = { id: string; label: string | null; city: string; address: string; comment: string | null; is_default: boolean };
export type AddressInput = { label?: string | null; city: string; address: string; comment?: string | null; isDefault?: boolean };
export type ApiOrderDetail = {
  order: { number: string; status: string; created_at: string; city: string; address: string; comment: string | null; payment: string; paid_at: string | null;
    subtotal: number; discount: number; discount_source: string | null; delivery: number; total: number; samples: string[] | null; delivered_at: string | null };
  items: { product_id: string; variant_id: string | null; name: string; price: number; qty: number; slug: string | null; images: string[] | null; pack: string | null; color: string | null; brand: string | null; active: boolean | null }[];
  log: { to_status: string; created_at: string }[];
};

export class ApiError extends Error {
  constructor(public code: string, public status: number, public data: Record<string, unknown> = {}) {
    super(code);
  }
}

async function call<T>(url: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(url, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
    cache: "no-store",
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(json.error || `http_${res.status}`, res.status, json);
  return json as T;
}

export const api = {
  me: () => call<{ customer: ApiCustomer | null; address: { city: string; address: string; comment: string | null } | null; completion?: number; lastPayment?: string | null }>("/api/auth/me"),
  requestCode: (phone: string) => call<{ requestId?: string; channel: "telegram" | "demo" | "none"; demoCode?: string }>("/api/auth/otp/request", { body: { phone } }),
  verifyCode: (requestId: string, code: string) => call<{ customer: ApiCustomer; isNew: boolean }>("/api/auth/otp/verify", { body: { requestId, code } }),
  saveProfile: (p: { firstName: string; lastName: string; birthDate: string | null; consent: true; marketing: boolean; lang: string; utm?: Record<string, string> }) =>
    call<{ customer: ApiCustomer }>("/api/auth/profile", { body: p }),
  logout: (all = false) => call<{ ok: true }>("/api/auth/logout", { method: "POST", body: { all } }),
  syncState: (mode: "merge" | "replace", cart: Record<string, number>, favorites: string[]) =>
    call<{ cart: Record<string, number>; favorites: string[] }>("/api/me/state", { method: "PUT", body: { mode, cart, favorites } }),
  updateProfile: (p: { firstName: string; lastName: string; birthDate: string | null; lang: "ru" | "uz"; marketing: boolean }) =>
    call<{ customer: ApiCustomer }>("/api/me/profile", { method: "PUT", body: p }),
  addresses: () => call<{ addresses: ApiAddress[] }>("/api/me/addresses"),
  addAddress: (a: AddressInput) => call<{ addresses: ApiAddress[] }>("/api/me/addresses", { body: a }),
  updateAddress: (id: string, a: AddressInput) => call<{ addresses: ApiAddress[] }>(`/api/me/addresses/${id}`, { method: "PUT", body: a }),
  deleteAddress: (id: string) => call<{ addresses: ApiAddress[] }>(`/api/me/addresses/${id}`, { method: "DELETE" }),
  order: (number: string) => call<ApiOrderDetail>(`/api/orders/${encodeURIComponent(number)}`),
  deleteAccount: () => call<{ ok: true }>("/api/me/delete", { body: { confirm: "DELETE" } }),
  createOrder: (o: Record<string, unknown>) => call<{ number: string; status: string; total: number; creatorCode: string | null }>("/api/orders", { body: o }),
  orders: () => call<{ orders: { id: string; number: string; status: string; total: number; created_at: string; items: { id: string; name: string; qty: number }[] }[] }>("/api/orders"),
};

/** UTM и ref из первого визита, для привязки клиента и заказа к креатору. */
export function storedUtm(): Record<string, string> | undefined {
  try {
    const d = JSON.parse(localStorage.getItem("nabi_attr") || "null");
    if (!d) return undefined;
    const out: Record<string, string> = {};
    for (const [k, v] of Object.entries(d)) if (typeof v === "string") out[k] = v;
    return out;
  } catch {
    return undefined;
  }
}
