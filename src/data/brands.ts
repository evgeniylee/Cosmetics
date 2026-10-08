// Стартовые описания брендов из демо-каталога. После запуска тексты правятся в админке («Бренды»).
import type { L10n } from "./catalog";

export type BrandSeed = { name: string; color: string; tagline: L10n; story: L10n; faq: { q: L10n; a: L10n }[] };

const KR = "Южная Корея";
export const BRAND_COUNTRY_DEFAULT = { ru: KR, uz: "Janubiy Koreya" };

export const BRAND_SEEDS: BrandSeed[] = [
  {
    name: "Anua",
    color: "#F3D9D6",
    tagline: { ru: "Короткие составы и мягкий уход для чувствительной кожи", uz: "Qisqa tarkib va sezgir teri uchun yumshoq parvarish" },
    story: {
      ru: "Anua — корейский бренд ухода, который делает ставку на простые формулы с растительными экстрактами.\n\nСамая известная линейка — Heartleaf с экстрактом хауттюйнии: тонер Heartleaf 77% стал одним из самых популярных успокаивающих тонеров в Корее.\n\n## С чего начать\nТонер Heartleaf 77% — универсальный первый шаг после умывания: снимает ощущение стянутости и готовит кожу к сыворотке.",
      uz: "Anua — o'simlik ekstraktlari asosidagi oddiy formulalarga tayanadigan koreys brendi.\n\nEng mashhur seriyasi — Heartleaf: Heartleaf 77% toneri Koreyadagi eng mashhur tinchlantiruvchi tonerlardan biri.",
    },
    faq: [
      { q: { ru: "С какого средства Anua начать?", uz: "Anua'ning qaysi vositasidan boshlash kerak?" }, a: { ru: "С тонера Heartleaf 77%: его используют после умывания утром и вечером, он подходит большинству типов кожи.", uz: "Heartleaf 77% toneridan: ertalab va kechqurun yuvinishdan keyin ishlatiladi." } },
    ],
  },
  {
    name: "Beauty of Joseon",
    color: "#F2E4C4",
    tagline: { ru: "Рецепты корейской традиционной косметики в современных формулах", uz: "An'anaviy koreys kosmetikasi retseptlari zamonaviy formulalarda" },
    story: {
      ru: "Beauty of Joseon вдохновляется традициями эпохи Чосон и ингредиентами корейской травяной косметики: рисом, женьшенем, зелёным чаем.\n\nВо всём мире бренд знают по солнцезащитному крему Relief Sun с рисом и пробиотиками — лёгкому, без белого следа, на каждый день.",
      uz: "Beauty of Joseon Choson davri an'analaridan ilhomlanadi: guruch, jenshen, yashil choy.\n\nBrend butun dunyoda Relief Sun quyoshdan himoya kremi bilan tanilgan.",
    },
    faq: [
      { q: { ru: "Нужен ли солнцезащитный крем зимой?", uz: "Qishda quyoshdan himoya kremi kerakmi?" }, a: { ru: "Да: ультрафиолет действует круглый год. Наносите SPF последним шагом утреннего ухода.", uz: "Ha: ultrabinafsha nurlar yil davomida ta'sir qiladi." } },
    ],
  },
  {
    name: "COSRX",
    color: "#E6E2D6",
    tagline: { ru: "Понятный уход с одним главным активом в каждом средстве", uz: "Har bir vositada bitta asosiy faol modda" },
    story: {
      ru: "COSRX — один из самых известных корейских брендов во всём мире. Его подход — эффективные средства с понятным главным компонентом.\n\nЛегенды бренда — эссенция Advanced Snail 96 Mucin Power Essence с муцином улитки и патчи Acne Pimple Master Patch.",
      uz: "COSRX — dunyodagi eng mashhur koreys brendlaridan biri.\n\nBrend afsonalari — Advanced Snail 96 Mucin essensiyasi va Acne Pimple Master patchlari.",
    },
    faq: [
      { q: { ru: "Как пользоваться патчами от прыщей?", uz: "Husnbuzar patchlaridan qanday foydalaniladi?" }, a: { ru: "Наклейте на чистую сухую кожу поверх воспаления и оставьте на несколько часов или на ночь.", uz: "Toza quruq teriga yopishtiring va bir necha soat yoki tunga qoldiring." } },
    ],
  },
  { name: "Illiyoon", color: "#E3ECF0", tagline: { ru: "Церамиды для сухой и чувствительной кожи всей семьи", uz: "Butun oila uchun quruq va sezgir teriga seramidlar" }, story: { ru: "Illiyoon — бренд корейской группы Amorepacific. Основа линеек — церамиды, которые помогают коже удерживать влагу.\n\nСредства подходят для лица и тела и рассчитаны на ежедневное использование.", uz: "Illiyoon — Amorepacific guruhining brendi. Asosi — terida namlikni saqlashga yordam beradigan seramidlar." }, faq: [] },
  { name: "Laneige", color: "#DCE6F5", tagline: { ru: "Увлажнение, которое знают во всём мире", uz: "Butun dunyo biladigan namlantirish" }, story: { ru: "Laneige — бренд корейской группы Amorepacific, специализирующийся на увлажнении.\n\nСамое известное средство — ночная маска для губ Lip Sleeping Mask.", uz: "Laneige — namlantirishga ixtisoslashgan Amorepacific brendi.\n\nEng mashhur vositasi — Lip Sleeping Mask." }, faq: [] },
  { name: "Medicube", color: "#F4DDE2", tagline: { ru: "Уход и домашние косметологические процедуры", uz: "Parvarish va uy kosmetologiya muolajalari" }, story: { ru: "Medicube — корейский бренд, который совмещает уходовую косметику и домашние косметологические приборы.\n\nСреди хитов — пэды Zero Pore для ухода за порами.", uz: "Medicube — parvarish kosmetikasi va uy kosmetologiya qurilmalarini birlashtiradi." }, faq: [] },
  { name: "Mixsoon", color: "#ECE7DC", tagline: { ru: "Минимум ингредиентов — максимум пользы", uz: "Minimal tarkib — maksimal foyda" }, story: { ru: "Mixsoon делает средства с очень короткими составами, где главную роль играет один-два компонента.\n\nСамая известная — эссенция на основе ферментированных бобов Bean Essence.", uz: "Mixsoon juda qisqa tarkibli vositalar ishlab chiqaradi." }, faq: [] },
  { name: "Round Lab", color: "#DDEAF2", tagline: { ru: "Чистый уход с морской водой острова Уллындо", uz: "Ulleungdo oroli dengiz suvi bilan toza parvarish" }, story: { ru: "Round Lab — корейский бренд с простыми мягкими формулами.\n\nЛинейка 1025 Dokdo создана на основе глубинной морской воды и подходит для ежедневного ухода за любым типом кожи.", uz: "Round Lab — oddiy va yumshoq formulali koreys brendi.\n\n1025 Dokdo seriyasi chuqur dengiz suvi asosida yaratilgan." }, faq: [] },
  { name: "SKIN1004", color: "#E4ECDD", tagline: { ru: "Центелла азиатская с Мадагаскара", uz: "Madagaskar sentellasi" }, story: { ru: "SKIN1004 строит уход вокруг экстракта центеллы азиатской с Мадагаскара — компонента, который успокаивает кожу.\n\nЛинейка Madagascar Centella подходит чувствительной и склонной к покраснениям коже.", uz: "SKIN1004 parvarishni Madagaskar sentellasi atrofida quradi." }, faq: [] },
  { name: "Some By Mi", color: "#E0EEDC", tagline: { ru: "Уход для проблемной кожи с кислотами", uz: "Muammoli teri uchun kislotali parvarish" }, story: { ru: "Some By Mi — корейский бренд, известный линейкой AHA BHA PHA 30 Days Miracle для кожи, склонной к несовершенствам.\n\nКислоты в средствах бренда мягко обновляют кожу, поэтому вводите их в уход постепенно и не забывайте про SPF.", uz: "Some By Mi — AHA BHA PHA 30 Days Miracle seriyasi bilan tanilgan." }, faq: [] },
  { name: "Torriden", color: "#DCE8F4", tagline: { ru: "Глубокое увлажнение гиалуроновой кислотой", uz: "Gialuron kislotasi bilan chuqur namlantirish" }, story: { ru: "Torriden — корейский бренд, ставший известным благодаря линейке DIVE-IN с низкомолекулярной гиалуроновой кислотой.\n\nСыворотка DIVE-IN глубоко увлажняет и подходит даже жирной коже благодаря лёгкой текстуре.", uz: "Torriden — DIVE-IN seriyasi bilan tanilgan koreys brendi." }, faq: [] },
];
