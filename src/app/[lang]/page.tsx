import { Brands, ContinueShopping, CreatorsPick, Hits, QuickCategories, QuizBanner, Seo, Subscribe, Trust, Videos } from "@/components/HomeBlocks";
import { HeroCarousel } from "@/components/HeroCarousel";

// Порядок секций главной (см. промт, раздел 2.3).
export default function Home() {
  return (
    <>
      <h1 className="sr-only">NABI — оригинальная корейская косметика в Узбекистане</h1>
      <HeroCarousel />
      <QuickCategories />
      <ContinueShopping />
      <Hits />
      <QuizBanner />
      <CreatorsPick />
      <Videos />
      <Trust />
      <Brands />
      <Subscribe />
      <Seo />
    </>
  );
}
