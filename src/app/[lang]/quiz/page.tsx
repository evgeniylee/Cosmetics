import Link from "next/link";
import { isLang } from "@/lib/i18n";

// Квиз подбора ухода — следующий этап (промт, раздел 2.9). Пока страница-заглушка.
export default async function QuizPage({ params }: { params: Promise<{ lang: string }> }) {
  const { lang } = await params;
  const l = isLang(lang) ? lang : "ru";
  return (
    <div className="wrap max-w-[720px] py-16 text-center">
      <h1 className="h-section">{l === "ru" ? "Подбор ухода" : "Parvarish tanlash"}</h1>
      <p className="mt-4 text-ink/70">
        {l === "ru" ? "Квиз из 6 вопросов появится на следующем этапе. Пока можно подобрать товары по типу и проблеме кожи в каталоге." : "Test keyingi bosqichda paydo bo'ladi. Hozircha katalogda teri turi bo'yicha tanlang."}
      </p>
      <Link href={`/${l}/catalog`} className="mt-6 inline-grid h-12 place-items-center rounded-card bg-accent px-6 font-semibold text-white">
        {l === "ru" ? "Открыть каталог" : "Katalogni ochish"}
      </Link>
    </div>
  );
}
