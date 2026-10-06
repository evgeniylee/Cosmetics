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
  needsProfile: boolean;
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
  me: () => call<{ customer: ApiCustomer | null; address: { city: string; address: string; comment: string | null } | null; completion?: number }>("/api/auth/me"),
  requestCode: (phone: string) => call<{ requestId?: string; channel: "telegram" | "demo" | "none"; demoCode?: string }>("/api/auth/otp/request", { body: { phone } }),
  verifyCode: (requestId: string, code: string) => call<{ customer: ApiCustomer; isNew: boolean }>("/api/auth/otp/verify", { body: { requestId, code } }),
  saveProfile: (p: { firstName: string; lastName: string; birthDate: string | null; consent: true; marketing: boolean; lang: string; utm?: Record<string, string> }) =>
    call<{ customer: ApiCustomer }>("/api/auth/profile", { body: p }),
  logout: () => call<{ ok: true }>("/api/auth/logout", { method: "POST", body: {} }),
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
