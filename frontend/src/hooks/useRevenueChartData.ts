import { useEffect, useState } from 'react';
import { adminService, type RevenueTrend } from '@/services/admin';

interface UseRevenueChartDataReturn {
  data: RevenueTrend[];
  isLoading: boolean;
}

export function useRevenueChartData(): UseRevenueChartDataReturn {
  const [data, setData] = useState<RevenueTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    adminService
      .getRevenueTrends(12)
      .then((trends) => {
        if (isMounted) setData(trends);
      })
      .catch((error: unknown) => {
        console.error('Failed to fetch revenue trends:', error);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return {
    data,
    isLoading,
  };
}
