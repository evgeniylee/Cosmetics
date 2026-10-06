"use client";
import { createContext, useContext } from "react";
import type { Lang } from "@/data/catalog";
import { getDict, type Dict } from "@/lib/i18n";

const Ctx = createContext<{ lang: Lang; t: Dict }>({ lang: "ru", t: getDict("ru") });

export function I18nProvider({ lang, children }: { lang: Lang; children: React.ReactNode }) {
  return <Ctx.Provider value={{ lang, t: getDict(lang) }}>{children}</Ctx.Provider>;
}

export const useI18n = () => useContext(Ctx);
