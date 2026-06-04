import { useCallback, useEffect, useState } from 'react';
import { orderService } from '@/services/order';
import { Order } from '@/types';

interface UseOrderDetailResult {
  order: Order | null;
  isLoading: boolean;
  error: string | null;
  setOrder: (order: Order) => void;
  refetch: () => Promise<void>;
}

export function useOrderDetail(orderId: string): UseOrderDetailResult {
  const [order, setOrder] = useState<Order | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);
      const result = await orderService.getOrder(orderId);
      setOrder(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load order');
    } finally {
      setIsLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return {
    order,
    isLoading,
    error,
    setOrder,
    refetch,
  };
}
