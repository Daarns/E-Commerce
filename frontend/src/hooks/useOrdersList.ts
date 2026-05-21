import { useState, useEffect } from 'react';
import { orderService } from '@/services/order';
import { Order, OrderStatus } from '@/types';
import { toast } from 'sonner';

type StatusTab = 'all' | 'pending' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

export function useOrdersList(isAuthenticated: boolean) {
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);

  // Fetch orders from API
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchOrders(): Promise<void> {
      setIsLoading(true);
      try {
        const result = await orderService.getOrders(currentPage, 20);
        setOrders(result.orders);
        setTotalPages(result.meta?.total_pages ?? 1);
      } catch {
        toast.error('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, [isAuthenticated, currentPage]);

  // Client-side filter by search + status tab
  useEffect(() => {
    let result = [...orders];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order.order_number.toLowerCase().includes(q) ||
          order.items.some((item) =>
            item.product_name.toLowerCase().includes(q)
          )
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((order) => order.order_status === statusFilter);
    }

    setFilteredOrders(result);
  }, [orders, searchQuery, statusFilter]);

  return {
    orders,
    filteredOrders,
    isLoading,
    searchQuery,
    setSearchQuery,
    statusFilter,
    setStatusFilter,
    totalPages,
    currentPage,
    setCurrentPage,
    setOrders,
  };
}
