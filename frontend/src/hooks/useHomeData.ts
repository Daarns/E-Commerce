import { useCallback, useEffect, useState } from 'react';
import { productService, categoryService } from '@/services/product';
import { Product, Category } from '@/types';
import { handleError } from '@/utils/error-handler';

interface UseHomeDataReturn {
  products: Product[];
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

export function useHomeData(): UseHomeDataReturn {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async (): Promise<void> => {
    try {
      setError(null);
      const [productsData, categoriesData] = await Promise.all([
        productService.getFeaturedProducts(8),
        categoryService.getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch (err) {
      const message = handleError(err, { context: 'Failed to load home data', showToast: false });
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return {
    products,
    categories,
    isLoading,
    error,
  };
}
