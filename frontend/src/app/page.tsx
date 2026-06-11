'use client';

import { Header } from '@/components/layout/header';
import { Footer } from '@/components/layout/footer';
import { HeroSection } from '@/components/layout/hero-section';
import { CategoriesSection } from '@/components/layout/categories-section';
import { FeaturedProductsSection } from '@/components/product/featured-products-section';
import { useHomeData } from '@/hooks/useHomeData';

export default function Home() {
  const { products, categories, isLoading, error } = useHomeData();

  return (
    <>
      <Header />
      <main className="flex-1">
        <HeroSection />
        <CategoriesSection categories={categories} />
        <FeaturedProductsSection products={products} isLoading={isLoading} error={error} />
      </main>
      <Footer />
    </>
  );
}
