import { BRANDS, CATEGORIES, CONCERNS, SKIN_TYPES, type L10n } from "./catalog";

// Структура меню «Каталог». Ссылки строятся на страницу каталога с фильтрами.
export type MenuLink = { label: L10n; href: string };
export type MenuColumn = { title: L10n; links: MenuLink[] };
export type MenuSection = {
  id: string;
  icon: string;
  label: L10n;
  href: string;
  columns?: MenuColumn[];
  brands?: boolean;
  promo?: { title: L10n; text: L10n; href: string; tone: string }[];
};

const cat = (id: string) => `/catalog?cat=${id}`;

export const NAV_LINKS: MenuLink[] = [
  { label: { ru: "Новинки", uz: "Yangiliklar" }, href: "/catalog?sort=new" },
  { label: { ru: "Хиты", uz: "Xitlar" }, href: "/catalog?sort=popular" },
  { label: { ru: "Сезон SPF", uz: "SPF mavsumi" }, href: cat("spf") },
  { label: { ru: "Против акне", uz: "Husnbuzarga qarshi" }, href: "/catalog?concern=acne" },
  { label: { ru: "Для сухой кожи", uz: "Quruq teri uchun" }, href: "/catalog?skin=dry" },
  { label: { ru: "Подбор ухода", uz: "Parvarish tanlash" }, href: "/quiz" },
  { label: { ru: "Выбор креаторов", uz: "Kreatorlar tanlovi" }, href: "/catalog?creator=MADINA" },
  { label: { ru: "Скидки", uz: "Chegirmalar" }, href: "/catalog?sort=popular" },
];

export const MENU: MenuSection[] = [
  {
    id: "face",
    icon: "dropper",
    label: { ru: "Уход за лицом", uz: "Yuz parvarishi" },
    href: "/catalog",
    columns: [
      {
        title: { ru: "Базовый уход", uz: "Asosiy parvarish" },
        links: CATEGORIES.filter((c) => ["clean", "toner", "cream", "spf"].includes(c.id)).map((c) => ({ label: c.name, href: cat(c.id) })),
      },
      {
        title: { ru: "Направленный уход", uz: "Maqsadli parvarish" },
        links: CATEGORIES.filter((c) => ["essence", "serum", "mask"].includes(c.id)).map((c) => ({ label: c.name, href: cat(c.id) })),
      },
    ],
    promo: [
      { title: { ru: "Подберём уход за 1 минуту", uz: "1 daqiqada parvarish" }, text: { ru: "6 вопросов о вашей коже", uz: "Teringiz haqida 6 savol" }, href: "/quiz", tone: "linear-gradient(150deg,#ffd9e8,#cdb8ef)" },
    ],
  },
  {
    id: "concern",
    icon: "spark",
    label: { ru: "По проблеме кожи", uz: "Teri muammosi bo'yicha" },
    href: "/catalog",
    columns: [
      { title: { ru: "Проблема", uz: "Muammo" }, links: CONCERNS.map((c) => ({ label: c.name, href: `/catalog?concern=${c.id}` })) },
    ],
    promo: [
      { title: { ru: "Против акне", uz: "Husnbuzarga qarshi" }, text: { ru: "Тонеры, патчи и сыворотки", uz: "Tonerlar, patchlar, zardoblar" }, href: "/catalog?concern=acne", tone: "linear-gradient(150deg,#d8f0dc,#9fd3b5)" },
    ],
  },
  {
    id: "skin",
    icon: "drop",
    label: { ru: "По типу кожи", uz: "Teri turi bo'yicha" },
    href: "/catalog",
    columns: [{ title: { ru: "Тип кожи", uz: "Teri turi" }, links: SKIN_TYPES.map((s) => ({ label: s.name, href: `/catalog?skin=${s.id}` })) }],
    promo: [
      { title: { ru: "Для сухой кожи", uz: "Quruq teri uchun" }, text: { ru: "Увлажнение без плёнки", uz: "Plyonkasiz namlash" }, href: "/catalog?skin=dry", tone: "linear-gradient(150deg,#dbe8f7,#9dc3e2)" },
    ],
  },
  { id: "brands", icon: "shield", label: { ru: "Бренды", uz: "Brendlar" }, href: "/catalog", brands: true },
  { id: "hits", icon: "star", label: { ru: "Хиты продаж", uz: "Xit savdolar" }, href: "/catalog?sort=popular" },
  { id: "new", icon: "gift", label: { ru: "Новинки", uz: "Yangiliklar" }, href: "/catalog?sort=new" },
  { id: "creators", icon: "heart", label: { ru: "Выбор креаторов", uz: "Kreatorlar tanlovi" }, href: "/catalog?creator=MADINA" },
];

export const POPULAR_BRANDS = BRANDS;
