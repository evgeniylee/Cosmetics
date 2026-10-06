import { Brands, ContinueShopping, CreatorsPick, Hero, Hits, QuickCategories, QuizBanner, Seo, Subscribe, Trust, Videos } from "@/components/HomeBlocks";

// Порядок секций главной (см. промт, раздел 2.3).
export default function Home() {
  return (
    <>
      <Hero />
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
