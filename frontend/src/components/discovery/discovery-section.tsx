'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Loader2, TrendingUp } from 'lucide-react';
import { productService } from '@/services/product';
import { Product } from '@/types';
import { ProductGrid } from '@/components/product/product-grid';

interface DiscoverySectionProps {
  title?: string;
  section?: 'trending' | 'new' | 'bestsellers';
  limit?: number;
  columns?: 2 | 3 | 4;
}

export function DiscoverySection({
  title,
  section = 'trending',
  limit = 8,
  columns = 4,
}: DiscoverySectionProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      setIsLoading(true);
      try {
        if (section === 'trending') {
          const data = await productService.getTrendingProducts('week', limit);
          setProducts(data);
        } else if (section === 'new') {
          const response = await productService.getProducts({
            limit,
            sort_by: 'newest',
          });
          setProducts(response.products);
        } else if (section === 'bestsellers') {
          const response = await productService.getProducts({
            limit,
            sort_by: 'popular',
          });
          setProducts(response.products);
        }
      } catch (error) {
        console.error(`Failed to load ${section} products:`, error);
      } finally {
        setIsLoading(false);
      }
    }

    loadProducts();
  }, [section, limit]);

  const defaultTitles = {
    trending: '🔥 Trending This Week',
    new: '✨ New Arrivals',
    bestsellers: '⭐ Best Sellers',
  };

  return (
    <section className="py-16">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        whileInView={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        viewport={{ once: true }}
        className="space-y-8"
      >
        <div className="flex items-center gap-2">
          <h2 className="text-3xl font-bold">{title || defaultTitles[section]}</h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : products.length > 0 ? (
          <ProductGrid products={products} columns={columns} />
        ) : (
          <div className="text-center py-20 text-muted-foreground">
            <p>No products found in this section.</p>
          </div>
        )}
      </motion.div>
    </section>
  );
}
