import { useCallback, useEffect, useState } from 'react';
import { adminService, type AdminOrder } from '@/services/admin';
import { toast } from 'sonner';

const ITEMS_PER_PAGE = 20;

export function useAdminRefundRequests() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);

  const loadRefundRequests = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const result = await adminService.getOrders({
        status: 'refund_requested',
        payment_status: 'paid',
        page: currentPage,
        limit: ITEMS_PER_PAGE,
      });
      setOrders(result.orders);
    } catch {
      toast.error('Gagal memuat refund request');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage]);

  useEffect(() => {
    void loadRefundRequests();
  }, [loadRefundRequests]);

  const handlePreviousPage = (): void => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const handleNextPage = (): void => {
    if (orders.length === ITEMS_PER_PAGE) {
      setCurrentPage((page) => page + 1);
    }
  };

  return {
    orders,
    isLoading,
    currentPage,
    itemsPerPage: ITEMS_PER_PAGE,
    handlePreviousPage,
    handleNextPage,
  };
}
