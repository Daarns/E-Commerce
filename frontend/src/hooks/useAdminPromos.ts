import { useState, useEffect, useCallback } from 'react';
import { promoAdminService, PromoCode } from '@/services/admin';
import { handleError } from '@/utils/error-handler';

const ITEMS_PER_PAGE = 20;

interface UseAdminPromosReturn {
  promos: PromoCode[];
  isLoading: boolean;
  total: number;
  page: number;
  search: string;
  filterActive: string;
  handleSearch: (value: string) => void;
  handleFilterActive: (value: string) => void;
  handlePageChange: (newPage: number) => void;
  handleDelete: (id: string) => Promise<void>;
  refresh: () => Promise<void>;
}

export function useAdminPromos(): UseAdminPromosReturn {
  const [promos, setPromos] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [filterActive, setFilterActive] = useState('');

  const loadPromos = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const result = await promoAdminService.list({
        code: search || undefined,
        is_active: filterActive || undefined,
        page,
        page_size: ITEMS_PER_PAGE,
      });
      setPromos(result.promo_codes ?? []);
      setTotal(Number(result.total) ?? 0);
    } catch (error) {
      handleError(error, { context: 'Failed to load promo codes' });
    } finally {
      setIsLoading(false);
    }
  }, [search, filterActive, page]);

  useEffect(() => {
    loadPromos();
  }, [loadPromos]);

  const handleSearch = useCallback((value: string): void => {
    setSearch(value);
    setPage(1);
  }, []);

  const handleFilterActive = useCallback((value: string): void => {
    setFilterActive(value);
    setPage(1);
  }, []);

  const handlePageChange = useCallback((newPage: number): void => {
    setPage(newPage);
  }, []);

  const handleDelete = useCallback(async (id: string): Promise<void> => {
    try {
      await promoAdminService.delete(id);
      await loadPromos();
    } catch (error) {
      handleError(error, { context: 'Failed to delete promo code' });
    }
  }, [loadPromos]);

  return {
    promos,
    isLoading,
    total,
    page,
    search,
    filterActive,
    handleSearch,
    handleFilterActive,
    handlePageChange,
    handleDelete,
    refresh: loadPromos,
  };
}
