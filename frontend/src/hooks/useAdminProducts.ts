import { useState, useEffect, useCallback } from 'react';
import { adminProductService, ProductFilters, AdminProduct } from '@/services/admin';
import { handleError } from '@/utils/error-handler';

interface UseAdminProductsReturn {
  products: AdminProduct[];
  isLoading: boolean;
  page: number;
  limit: number;
  total: number;
  filters: ProductFilters;
  totalPages: number;
  handleFiltersChange: (newFilters: ProductFilters) => void;
  handleSort: (sortBy: ProductFilters['sort_by'], sortOrder: 'asc' | 'desc') => void;
  handlePageChange: (newPage: number) => void;
  handleDelete: (productId: string) => Promise<void>;
}

export function useAdminProducts(): UseAdminProductsReturn {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [filters, setFilters] = useState<ProductFilters>({
    sort_by: 'created_at',
    sort_order: 'desc',
  });

  const limit = 20;
  const totalPages = Math.ceil(total / limit);

  const loadProducts = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await adminProductService.getProducts(filters, page, limit);
      setProducts(response.data.products);
      setTotal(response.data.total);
    } catch (error) {
      handleError(error, { context: 'Failed to load products' });
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleFiltersChange = useCallback((newFilters: ProductFilters): void => {
    setFilters(newFilters);
    setPage(1);
  }, []);

  const handleSort = useCallback(
    (sortBy: ProductFilters['sort_by'], sortOrder: 'asc' | 'desc'): void => {
      setFilters((prev) => ({
        ...prev,
        sort_by: sortBy,
        sort_order: sortOrder,
      }));
      setPage(1);
    },
    []
  );

  const handlePageChange = useCallback((newPage: number): void => {
    setPage(newPage);
  }, []);

  const handleDelete = useCallback(async (productId: string): Promise<void> => {
    try {
      await adminProductService.deleteProduct(productId);
      await loadProducts();
    } catch (error) {
      handleError(error, { context: 'Failed to delete product' });
    }
  }, [loadProducts]);

  return {
    products,
    isLoading,
    page,
    limit,
    total,
    filters,
    totalPages,
    handleFiltersChange,
    handleSort,
    handlePageChange,
    handleDelete,
  };
}
