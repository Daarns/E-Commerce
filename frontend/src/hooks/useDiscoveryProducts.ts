import { useEffect, useState } from 'react';
import { productService } from '@/services/product';
import type { Product } from '@/types';

export type DiscoverySectionType = 'trending' | 'new' | 'bestsellers';

interface UseDiscoveryProductsParams {
  section: DiscoverySectionType;
  limit: number;
}

interface UseDiscoveryProductsReturn {
  products: Product[];
  isLoading: boolean;
}

export function useDiscoveryProducts({
  section,
  limit,
}: UseDiscoveryProductsParams): UseDiscoveryProductsReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    async function loadProducts(): Promise<void> {
      setIsLoading(true);
      try {
        if (section === 'trending') {
          const data = await productService.getTrendingProducts('week', limit);
          if (isMounted) setProducts(data);
          return;
        }

        const response = await productService.getProducts({
          limit,
          sort_by: section === 'new' ? 'newest' : 'popular',
        });

        if (isMounted) setProducts(response.products);
      } catch (error) {
        console.error(`Failed to load ${section} products:`, error);
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void loadProducts();

    return () => {
      isMounted = false;
    };
  }, [section, limit]);

  return {
    products,
    isLoading,
  };
}
