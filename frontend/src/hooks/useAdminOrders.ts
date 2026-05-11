import { useState, useEffect, useCallback } from 'react';
import { adminService, OrderFilters, AdminOrderMetrics, AdminOrder } from '@/services/admin';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 20;

export function useAdminOrders() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [metrics, setMetrics] = useState<AdminOrderMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<OrderFilters>({});

  const loadOrders = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const result = await adminService.getOrders({
        ...filters,
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setOrders(result.orders);
    } catch {
      toast.error('Gagal memuat order');
    } finally {
      setIsLoading(false);
    }
  }, [filters, currentPage]);

  const loadMetrics = useCallback(async (): Promise<void> => {
    try {
      const data = await adminService.getOrderMetrics();
      setMetrics(data);
    } catch {
      toast.error('Gagal memuat metrics');
    }
  }, []);

  useEffect(() => {
    loadOrders();
  }, [loadOrders]);

  useEffect(() => {
    loadMetrics();
  }, [loadMetrics]);

  const handleFilterChange = (newFilters: OrderFilters): void => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleReset = (): void => {
    setFilters({});
    setCurrentPage(1);
  };

  const handlePreviousPage = (): void => {
    setCurrentPage((p) => Math.max(1, p - 1));
  };

  const handleNextPage = (): void => {
    if (orders.length === ITEMS_PER_PAGE) {
      setCurrentPage((p) => p + 1);
    }
  };

  return {
    orders,
    metrics,
    isLoading,
    currentPage,
    filters,
    handleFilterChange,
    handleReset,
    handlePreviousPage,
    handleNextPage,
    itemsPerPage: ITEMS_PER_PAGE,
  };
}
