import { Brands, ContinueShopping, CreatorsPick, HomeRail, QuickCategories, QuizBanner, Seo, Subscribe, Trust, Videos } from "@/components/HomeBlocks";
import { HeroCarousel } from "@/components/HeroCarousel";

// Порядок секций главной. Ленты (хиты, новинки, скидки, рекомендуем) и видео настраиваются в админке «Витрина»;
// пустой блок не показывается.
export default function Home() {
  return (
    <>
      <h1 className="sr-only">NABI — оригинальная корейская косметика в Узбекистане</h1>
      <HeroCarousel />
      <QuickCategories />
      <ContinueShopping />
      <HomeRail k="hits" />
      <Videos />
      <HomeRail k="new" />
      <QuizBanner />
      <HomeRail k="sale" />
      <CreatorsPick />
      <HomeRail k="recommended" />
      <Trust />
      <Brands />
      <Subscribe />
      <Seo />
    </>
  );
}
