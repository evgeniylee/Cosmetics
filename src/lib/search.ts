import { CATEGORIES, CONCERNS, PRODUCTS, type CategoryId, type Concern, type Product } from "@/data/catalog";

const CYR: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "e", ж: "j", з: "z", и: "i", й: "y", к: "k", л: "l", м: "m",
  н: "n", о: "o", п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "ts", ч: "ch", ш: "sh", щ: "sh",
  ъ: "", ы: "i", ь: "", э: "e", ю: "yu", я: "ya", ў: "o", қ: "q", ғ: "g", ҳ: "h",
};

/** Нормализует строку: нижний регистр, кириллица → латиница, похожие буквы склеиваются. */
export function norm(s: string) {
  return s
    .toLowerCase()
    .split("")
    .map((c) => CYR[c] ?? c)
    .join("")
    .replace(/['ʻʼ`’]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/c/g, "k")
    .replace(/x/g, "ks")
    .replace(/w/g, "v")
    .replace(/\s+/g, " ")
    .trim();
}

// Синонимы: слова, по которым ищут проблему или категорию.
const CONCERN_WORDS: Record<Concern, string[]> = {
  acne: ["прыщ", "акне", "высып", "воспал", "постакне", "husnbuzar", "toshma", "acne", "pimple"],
  dryness: ["сухо", "шелуш", "стянут", "увлаж", "quruq", "namla", "dry"],
  pigment: ["пигмент", "пятн", "веснуш", "dog", "pigment", "oqart"],
  redness: ["покрасн", "раздраж", "чувствит", "купероз", "qizar", "sezgir", "red"],
  aging: ["морщин", "возраст", "антивозраст", "anti age", "ajin", "qarish"],
  pores: ["пор", "черн точ", "черные точки", "govak", "qora nuqta", "pore"],
  dullness: ["тускл", "сиян", "glow", "yorqin", "xira"],
};

const CAT_WORDS: Record<CategoryId, string[]> = {
  clean: ["умыв", "пенк", "гель для ум", "очищ", "tozala", "yuvish", "cleanser"],
  toner: ["тонер", "тоник", "toner"],
  essence: ["эссенц", "essens", "essence"],
  serum: ["сыворот", "ампул", "serum", "zardob", "ampula"],
  cream: ["крем", "krem", "cream", "увлажняющ"],
  spf: ["spf", "санскрин", "солнц", "sunscreen", "sun", "quyosh", "спф"],
  mask: ["маск", "патч", "пэд", "niqob", "patch", "pad", "mask"],
};

function lev(a: string, b: string) {
  if (Math.abs(a.length - b.length) > 2) return 9;
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

const has = (q: string, words: string[]) => words.some((w) => q.includes(norm(w)));

export type SearchResult = { products: Product[]; categories: CategoryId[]; concerns: Concern[] };

export function search(raw: string): SearchResult {
  const q = norm(raw);
  if (q.length < 2) return { products: [], categories: [], concerns: [] };
  const tokens = q.split(" ").filter((t) => t.length > 1);

  const concerns = (Object.keys(CONCERN_WORDS) as Concern[]).filter((c) => has(q, CONCERN_WORDS[c]));
  const categories = (Object.keys(CAT_WORDS) as CategoryId[]).filter((c) => has(q, CAT_WORDS[c]));

  const scored = PRODUCTS.map((p) => {
    const brand = norm(p.brand).replace(/ /g, "");
    const hay = norm(`${p.brand} ${p.name} ${p.type.ru} ${p.type.uz}`);
    const words = hay.split(" ");
    let score = 0;
    for (const t of tokens) {
      if (hay.includes(t)) score += 3;
      else if (t.length >= 4 && (lev(t, brand) <= 2 || words.some((w) => w.length >= 4 && lev(t, w) <= 1))) score += 2;
    }
    if (categories.includes(p.cat)) score += 2;
    score += p.concerns.filter((c) => concerns.includes(c)).length * 2;
    return { p, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || b.p.reviews - a.p.reviews);

  return { products: scored.map((x) => x.p), categories, concerns };
}

export const POPULAR_QUERIES = {
  ru: ["SPF", "от прыщей", "COSRX", "увлажнение", "Anua", "патчи"],
  uz: ["SPF", "husnbuzar", "COSRX", "namlash", "Anua", "patch"],
};

export const catName = (id: CategoryId, lang: "ru" | "uz") => CATEGORIES.find((c) => c.id === id)!.name[lang];
export const concernName = (id: Concern, lang: "ru" | "uz") => CONCERNS.find((c) => c.id === id)!.name[lang];
