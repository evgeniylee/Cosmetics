// Справочники (категории, типы кожи, проблемы) и демо-товары для первого заполнения базы.
// Рабочий каталог хранится в базе и редактируется в админке; на витрине он доступен через useCatalog().
export type Lang = "ru" | "uz";
export type L10n = { ru: string; uz: string };

export type CategoryId = "clean" | "toner" | "essence" | "serum" | "spf" | "cream" | "mask";
export type SkinType = "dry" | "oily" | "combo" | "sens" | "normal";
export type Concern = "acne" | "dryness" | "pigment" | "redness" | "aging" | "pores" | "dullness";
export type Pack = "bottle" | "tube" | "jar" | "pump" | "dropper";

export type Product = {
  id: string;
  slug: string;
  brand: string;
  name: string;
  type: L10n;
  cat: CategoryId;
  skin: SkinType[];
  concerns: Concern[];
  volume: number; // мл или шт.
  unit: "ml" | "pcs" | "g";
  price: number;
  oldPrice?: number;
  rating: number;
  reviews: number;
  color: string;
  pack: Pack;
  badge?: "hit" | "choice" | "new";
  rank?: L10n;
  daysSupply: number;
  desc: L10n;
  why: L10n;
  howTo: L10n;
  ingredients: L10n[];
  reviewSummary?: L10n;
  fbt: string[];
  images?: string[];
  stock?: "in_stock" | "on_order" | "out";
};

export const CATEGORIES: { id: CategoryId; name: L10n; icon: string }[] = [
  { id: "clean", name: { ru: "Очищение", uz: "Tozalash" }, icon: "drop" },
  { id: "toner", name: { ru: "Тонеры", uz: "Tonerlar" }, icon: "bottle" },
  { id: "essence", name: { ru: "Эссенции", uz: "Essensiyalar" }, icon: "spark" },
  { id: "serum", name: { ru: "Сыворотки", uz: "Zardoblar" }, icon: "dropper" },
  { id: "cream", name: { ru: "Кремы", uz: "Kremlar" }, icon: "jar" },
  { id: "spf", name: { ru: "SPF", uz: "SPF" }, icon: "sun" },
  { id: "mask", name: { ru: "Маски и пэды", uz: "Niqob va pedlar" }, icon: "mask" },
];

export const SKIN_TYPES: { id: SkinType; name: L10n }[] = [
  { id: "dry", name: { ru: "Сухая", uz: "Quruq" } },
  { id: "oily", name: { ru: "Жирная", uz: "Yog'li" } },
  { id: "combo", name: { ru: "Комбинированная", uz: "Aralash" } },
  { id: "sens", name: { ru: "Чувствительная", uz: "Sezgir" } },
  { id: "normal", name: { ru: "Нормальная", uz: "Normal" } },
];

export const CONCERNS: { id: Concern; name: L10n }[] = [
  { id: "acne", name: { ru: "Акне", uz: "Husnbuzar" } },
  { id: "dryness", name: { ru: "Сухость", uz: "Quruqlik" } },
  { id: "pigment", name: { ru: "Пигментация", uz: "Dog'lar" } },
  { id: "redness", name: { ru: "Покраснения", uz: "Qizarish" } },
  { id: "aging", name: { ru: "Возрастные изменения", uz: "Qarish belgilari" } },
  { id: "pores", name: { ru: "Расширенные поры", uz: "Kengaygan g'ovaklar" } },
  { id: "dullness", name: { ru: "Тусклость", uz: "Xiralik" } },
];

const P = (p: Product) => p;

/** Демо-товары: попадают в базу только при первом запуске, если таблица товаров пуста. */
export const SEED_PRODUCTS: Product[] = [
  P({ id: "1", slug: "cosrx-snail-96-mucin-essence", brand: "COSRX", name: "Advanced Snail 96 Mucin Power Essence", type: { ru: "Эссенция для лица", uz: "Yuz uchun essensiya" }, cat: "essence", skin: ["dry", "sens", "combo", "normal"], concerns: ["dryness", "redness"], volume: 100, unit: "ml", price: 215000, rating: 4.8, reviews: 126, color: "#E6DCCB", pack: "pump", badge: "hit", rank: { ru: "#1 в эссенциях", uz: "Essensiyalarda #1" }, daysSupply: 75,
    desc: { ru: "Эссенция с 96% муцина улитки. Глубоко увлажняет, помогает коже восстановиться после воспалений и раздражения.", uz: "96% shilliq qurt mutsini bilan essensiya. Chuqur namlaydi, terining tiklanishiga yordam beradi." },
    why: { ru: "Самый понятный первый шаг в корейском уходе: подходит почти всем и сразу даёт ощущение увлажнённой кожи.", uz: "Koreys parvarishidagi eng oddiy birinchi qadam: deyarli hammaga mos keladi." },
    howTo: { ru: "После тонера нанесите 2–3 нажатия и распределите похлопывающими движениями.", uz: "Tonerdan keyin 2–3 marta bosib, yengil urib surting." },
    ingredients: [{ ru: "Муцин улитки 96%", uz: "Shilliq qurt mutsini 96%" }, { ru: "Гиалуронат натрия", uz: "Natriy gialuronat" }, { ru: "Пантенол", uz: "Pantenol" }],
    reviewSummary: { ru: "Покупатели отмечают мгновенное увлажнение и то, что эссенция не липнет после впитывания.", uz: "Xaridorlar tez namlanish va yopishqoqlik qolmasligini ta'kidlaydi." },
    fbt: ["4", "2"] }),
  P({ id: "2", slug: "beauty-of-joseon-relief-sun-spf50", brand: "Beauty of Joseon", name: "Relief Sun Rice + Probiotics SPF50+ PA++++", type: { ru: "Солнцезащитный крем", uz: "Quyoshdan himoya kremi" }, cat: "spf", skin: ["dry", "combo", "sens", "normal", "oily"], concerns: ["pigment", "aging"], volume: 50, unit: "ml", price: 185000, oldPrice: 210000, rating: 4.9, reviews: 214, color: "#F2E1AE", pack: "tube", badge: "hit", rank: { ru: "#1 в SPF", uz: "SPF da #1" }, daysSupply: 45,
    desc: { ru: "Лёгкий санскрин с рисовым экстрактом и пробиотиками. Не оставляет белых следов, подходит под макияж.", uz: "Guruch ekstrakti va probiotiklar bilan yengil quyoshdan himoya. Oq iz qoldirmaydi." },
    why: { ru: "Текстура как у увлажняющего крема, поэтому его реально хочется наносить каждый день.", uz: "Namlovchi krem kabi tekstura, uni har kuni surtish yoqimli." },
    howTo: { ru: "Последний шаг утреннего ухода. На солнце обновляйте каждые 2–3 часа.", uz: "Ertalabki parvarishning oxirgi bosqichi. Quyoshda har 2–3 soatda yangilang." },
    ingredients: [{ ru: "Экстракт риса", uz: "Guruch ekstrakti" }, { ru: "Пробиотики", uz: "Probiotiklar" }, { ru: "Химические фильтры", uz: "Kimyoviy filtrlar" }],
    reviewSummary: { ru: "Хвалят за отсутствие белых следов и лёгкость. Пару человек пишут, что на жирной коже к вечеру появляется блеск.", uz: "Oq iz yo'qligi va yengilligi uchun maqtashadi." },
    fbt: ["10", "5"] }),
  P({ id: "3", slug: "anua-heartleaf-77-toner", brand: "Anua", name: "Heartleaf 77% Soothing Toner", type: { ru: "Тонер для лица", uz: "Yuz uchun toner" }, cat: "toner", skin: ["oily", "combo", "sens"], concerns: ["redness", "acne"], volume: 250, unit: "ml", price: 245000, rating: 4.7, reviews: 98, color: "#C9E1CD", pack: "bottle", daysSupply: 90,
    desc: { ru: "Успокаивающий тонер с 77% экстракта хауттюйнии. Снимает покраснения и выравнивает тон.", uz: "77% xauttyuyniya ekstrakti bilan tinchlantiruvchi toner." },
    why: { ru: "Большой объём, мягкое действие и заметно меньше покраснений через пару недель.", uz: "Katta hajm, yumshoq ta'sir va qizarish kamayadi." },
    howTo: { ru: "После умывания на ватный диск или в ладони.", uz: "Yuvingandan keyin paxta diskka yoki kaftga." },
    ingredients: [{ ru: "Хауттюйния 77%", uz: "Xauttyuyniya 77%" }, { ru: "Пантенол", uz: "Pantenol" }],
    fbt: ["6", "4"] }),
  P({ id: "4", slug: "round-lab-dokdo-cleanser", brand: "Round Lab", name: "1025 Dokdo Cleanser", type: { ru: "Пенка для умывания", uz: "Yuvish uchun ko'pik" }, cat: "clean", skin: ["dry", "combo", "sens", "normal"], concerns: ["dryness"], volume: 150, unit: "ml", price: 159000, rating: 4.6, reviews: 61, color: "#BCD3E6", pack: "tube", daysSupply: 60,
    desc: { ru: "Мягкая пенка со слабокислым pH и морской водой. Очищает без чувства стянутости.", uz: "Kuchsiz kislotali pH va dengiz suvi bilan yumshoq ko'pik." },
    why: { ru: "Очищает тщательно, но не пересушивает даже чувствительную кожу.", uz: "Yaxshi tozalaydi, lekin sezgir terini ham quritmaydi." },
    howTo: { ru: "Вспеньте в ладонях, помассируйте 30 секунд, смойте тёплой водой.", uz: "Kaftda ko'pirtiring, 30 soniya massaj qiling, yuving." },
    ingredients: [{ ru: "Морская вода", uz: "Dengiz suvi" }, { ru: "Бетаин", uz: "Betain" }],
    fbt: ["3", "1"] }),
  P({ id: "5", slug: "torriden-dive-in-serum", brand: "Torriden", name: "DIVE-IN Low Molecule Hyaluronic Acid Serum", type: { ru: "Сыворотка для лица", uz: "Yuz uchun zardob" }, cat: "serum", skin: ["dry", "combo", "oily", "sens", "normal"], concerns: ["dryness", "dullness"], volume: 50, unit: "ml", price: 229000, rating: 4.8, reviews: 143, color: "#9DC3E2", pack: "dropper", badge: "choice", daysSupply: 60,
    desc: { ru: "Сыворотка с пятью видами гиалуроновой кислоты для глубокого увлажнения без плёнки.", uz: "Besh turdagi gialuron kislotasi bilan chuqur namlovchi zardob." },
    why: { ru: "Подходит всем типам кожи и хорошо работает с любой другой косметикой.", uz: "Barcha teri turlariga mos va boshqa vositalar bilan yaxshi ishlaydi." },
    howTo: { ru: "Утром и вечером после тонера, 3–4 капли.", uz: "Ertalab va kechqurun tonerdan keyin 3–4 tomchi." },
    ingredients: [{ ru: "Гиалуроновая кислота (5 видов)", uz: "Gialuron kislotasi (5 tur)" }, { ru: "Пантенол", uz: "Pantenol" }],
    fbt: ["2", "11"] }),
  P({ id: "6", slug: "skin1004-centella-ampoule", brand: "SKIN1004", name: "Madagascar Centella Ampoule", type: { ru: "Ампульная сыворотка", uz: "Ampula zardob" }, cat: "serum", skin: ["sens", "oily", "combo"], concerns: ["redness", "acne"], volume: 100, unit: "ml", price: 239000, oldPrice: 265000, rating: 4.7, reviews: 88, color: "#E5D2A4", pack: "dropper", daysSupply: 90,
    desc: { ru: "Ампула со 100% экстрактом центеллы азиатской. Успокаивает и укрепляет защитный барьер.", uz: "100% sentella ekstrakti bilan ampula. Tinchlantiradi va himoya to'sig'ini mustahkamlaydi." },
    why: { ru: "Один состав, одна задача: спокойная кожа без лишних компонентов.", uz: "Bitta tarkib, bitta vazifa: tinch teri." },
    howTo: { ru: "3–4 капли после тонера утром и вечером.", uz: "Ertalab va kechqurun tonerdan keyin 3–4 tomchi." },
    ingredients: [{ ru: "Центелла азиатская 100%", uz: "Sentella 100%" }],
    fbt: ["3", "2"] }),
  P({ id: "7", slug: "some-by-mi-aha-bha-pha-toner", brand: "Some By Mi", name: "AHA BHA PHA 30 Days Miracle Toner", type: { ru: "Кислотный тонер", uz: "Kislotali toner" }, cat: "toner", skin: ["oily", "combo"], concerns: ["acne", "pores"], volume: 150, unit: "ml", price: 175000, rating: 4.5, reviews: 77, color: "#93CC9E", pack: "bottle", daysSupply: 60,
    desc: { ru: "Тонер с тремя видами кислот и чайным деревом против чёрных точек и неровного рельефа.", uz: "Uch turdagi kislota va choy daraxti bilan qora nuqtalarga qarshi toner." },
    why: { ru: "Мягкий вход в кислоты для жирной кожи, если раньше их не использовали.", uz: "Yog'li teri uchun kislotalarga yumshoq kirish." },
    howTo: { ru: "Вечером 3–4 раза в неделю. Днём обязателен SPF.", uz: "Kechqurun haftasiga 3–4 marta. Kunduzi SPF majburiy." },
    ingredients: [{ ru: "AHA, BHA, PHA кислоты", uz: "AHA, BHA, PHA kislotalari" }, { ru: "Чайное дерево", uz: "Choy daraxti" }],
    fbt: ["2", "10"] }),
  P({ id: "8", slug: "medicube-zero-pore-pad", brand: "Medicube", name: "Zero Pore Pad 2.0", type: { ru: "Пэды для лица", uz: "Yuz uchun pedlar" }, cat: "mask", skin: ["oily", "combo"], concerns: ["pores", "acne"], volume: 70, unit: "pcs", price: 289000, rating: 4.6, reviews: 52, color: "#F0C3CA", pack: "jar", badge: "new", daysSupply: 70,
    desc: { ru: "Двусторонние пэды: рельефная сторона отшелушивает, гладкая успокаивает и сужает поры.", uz: "Ikki tomonlama pedlar: biri peeling qiladi, ikkinchisi tinchlantiradi." },
    why: { ru: "Видимый результат на порах за пару недель при регулярном использовании.", uz: "Muntazam ishlatilganda g'ovaklarda natija ko'rinadi." },
    howTo: { ru: "Протрите лицо рельефной стороной, затем гладкой.", uz: "Yuzni avval relyefli, keyin silliq tomoni bilan arting." },
    ingredients: [{ ru: "AHA и BHA", uz: "AHA va BHA" }, { ru: "Цинк", uz: "Rux" }],
    fbt: ["2", "7"] }),
  P({ id: "9", slug: "beauty-of-joseon-glow-serum", brand: "Beauty of Joseon", name: "Glow Serum Propolis + Niacinamide", type: { ru: "Сыворотка для лица", uz: "Yuz uchun zardob" }, cat: "serum", skin: ["oily", "combo", "dry", "normal"], concerns: ["dullness", "acne", "pigment"], volume: 30, unit: "ml", price: 169000, rating: 4.7, reviews: 109, color: "#E8B46C", pack: "dropper", daysSupply: 45,
    desc: { ru: "Сыворотка с прополисом и ниацинамидом для сияния и ровного тона.", uz: "Yorqinlik va tekis rang uchun propolis va niatsinamidli zardob." },
    why: { ru: "Хороший выбор, если кожа тусклая и есть следы постакне.", uz: "Teri xira bo'lsa va husnbuzar izlari bo'lsa yaxshi tanlov." },
    howTo: { ru: "2–3 капли утром или вечером после тонера.", uz: "Tonerdan keyin 2–3 tomchi." },
    ingredients: [{ ru: "Прополис 60%", uz: "Propolis 60%" }, { ru: "Ниацинамид 2%", uz: "Niatsinamid 2%" }],
    fbt: ["2", "4"] }),
  P({ id: "10", slug: "cosrx-good-morning-gel-cleanser", brand: "COSRX", name: "Low pH Good Morning Gel Cleanser", type: { ru: "Гель для умывания", uz: "Yuvish geli" }, cat: "clean", skin: ["oily", "combo", "sens"], concerns: ["acne", "pores"], volume: 150, unit: "ml", price: 129000, rating: 4.6, reviews: 95, color: "#9ED2B4", pack: "tube", daysSupply: 60,
    desc: { ru: "Утренний гель с чайным деревом и BHA. Очищает поры и не нарушает pH кожи.", uz: "Choy daraxti va BHA bilan ertalabki gel." },
    why: { ru: "Недорогой и понятный гель для жирной кожи на каждый день.", uz: "Yog'li teri uchun arzon va oddiy kundalik gel." },
    howTo: { ru: "Утром на влажную кожу, смыть тёплой водой.", uz: "Ertalab nam teriga, iliq suv bilan yuving." },
    ingredients: [{ ru: "BHA", uz: "BHA" }, { ru: "Чайное дерево", uz: "Choy daraxti" }],
    fbt: ["7", "2"] }),
  P({ id: "11", slug: "laneige-water-sleeping-mask", brand: "Laneige", name: "Water Sleeping Mask", type: { ru: "Ночная маска", uz: "Tungi niqob" }, cat: "mask", skin: ["dry", "combo", "normal"], concerns: ["dryness", "dullness"], volume: 70, unit: "ml", price: 319000, rating: 4.8, reviews: 67, color: "#8DB1E6", pack: "jar", daysSupply: 60,
    desc: { ru: "Несмываемая ночная маска. Утром кожа увлажнённая и отдохнувшая.", uz: "Yuvilmaydigan tungi niqob. Ertalab teri namlangan." },
    why: { ru: "Быстрый способ спасти обезвоженную кожу после перелёта или недосыпа.", uz: "Suvsizlangan terini tez tiklash usuli." },
    howTo: { ru: "Последним шагом вечером 2–3 раза в неделю.", uz: "Haftasiga 2–3 marta kechki oxirgi bosqich." },
    ingredients: [{ ru: "Гиалуроновая кислота", uz: "Gialuron kislotasi" }, { ru: "Сквалан", uz: "Skvalan" }],
    fbt: ["5", "1"] }),
  P({ id: "12", slug: "mixsoon-bean-essence", brand: "Mixsoon", name: "Bean Essence", type: { ru: "Эссенция для лица", uz: "Yuz uchun essensiya" }, cat: "essence", skin: ["dry", "combo", "oily", "normal"], concerns: ["dullness", "pores"], volume: 50, unit: "ml", price: 225000, rating: 4.6, reviews: 41, color: "#E3D9C4", pack: "pump", badge: "new", daysSupply: 50,
    desc: { ru: "Ферментированная соевая эссенция. Мягко отшелушивает и выравнивает текстуру.", uz: "Fermentlangan soya essensiyasi. Teri teksturasini tekislaydi." },
    why: { ru: "Даёт эффект мягкого пилинга без кислотных ощущений.", uz: "Kislotasiz yumshoq peeling effekti." },
    howTo: { ru: "После тонера 1–2 нажатия.", uz: "Tonerdan keyin 1–2 bosim." },
    ingredients: [{ ru: "Ферментированная соя", uz: "Fermentlangan soya" }],
    fbt: ["2", "3"] }),
  P({ id: "13", slug: "illiyoon-ceramide-ato-cream", brand: "Illiyoon", name: "Ceramide Ato Concentrate Cream", type: { ru: "Крем для лица и тела", uz: "Yuz va tana kremi" }, cat: "cream", skin: ["dry", "sens", "normal"], concerns: ["dryness", "redness"], volume: 200, unit: "ml", price: 199000, rating: 4.8, reviews: 58, color: "#D7E4EE", pack: "tube", badge: "choice", daysSupply: 60,
    desc: { ru: "Плотный крем с церамидами для очень сухой и чувствительной кожи.", uz: "Juda quruq va sezgir teri uchun seramidli krem." },
    why: { ru: "Восстанавливает барьер и подходит всей семье, включая детей.", uz: "To'siqni tiklaydi va butun oilaga mos." },
    howTo: { ru: "На лицо и тело после душа.", uz: "Dushdan keyin yuz va tanaga." },
    ingredients: [{ ru: "Церамиды", uz: "Seramidlar" }, { ru: "Глицерин", uz: "Glitserin" }],
    fbt: ["4", "1"] }),
  P({ id: "14", slug: "cosrx-acne-pimple-patch", brand: "COSRX", name: "Acne Pimple Master Patch", type: { ru: "Патчи от прыщей", uz: "Husnbuzar uchun patchlar" }, cat: "mask", skin: ["oily", "combo", "sens", "dry", "normal"], concerns: ["acne"], volume: 24, unit: "pcs", price: 49000, rating: 4.7, reviews: 133, color: "#F6E9D8", pack: "jar", daysSupply: 30,
    desc: { ru: "Гидроколлоидные патчи. Вытягивают содержимое и защищают воспаление от рук.", uz: "Gidrokolloid patchlar. Yallig'lanishni himoya qiladi." },
    why: { ru: "Маленькая и недорогая вещь, которая работает за одну ночь.", uz: "Bir kechada ishlaydigan arzon vosita." },
    howTo: { ru: "На чистую сухую кожу на 6–8 часов.", uz: "Toza quruq teriga 6–8 soatga." },
    ingredients: [{ ru: "Гидроколлоид", uz: "Gidrokolloid" }],
    fbt: ["10", "7"] }),
];

export const SAMPLES: { id: string; name: L10n }[] = [
  { id: "s1", name: { ru: "Пробник SPF Beauty of Joseon", uz: "Beauty of Joseon SPF namunasi" } },
  { id: "s2", name: { ru: "Пробник эссенции COSRX", uz: "COSRX essensiyasi namunasi" } },
  { id: "s3", name: { ru: "Тканевая маска Mediheal", uz: "Mediheal mato niqobi" } },
  { id: "s4", name: { ru: "Пробник крема Illiyoon", uz: "Illiyoon kremi namunasi" } },
];

export const UNITS = { ml: { ru: "мл", uz: "ml" }, pcs: { ru: "шт", uz: "dona" }, g: { ru: "г", uz: "g" } } as const;
export const PACKS: Pack[] = ["bottle", "tube", "jar", "pump", "dropper"];
