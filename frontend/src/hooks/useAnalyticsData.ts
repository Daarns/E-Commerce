import { useState, useEffect, useCallback } from 'react';
import {
  adminService,
  RevenueMetrics,
  OrderMetrics,
  CustomerMetrics,
  RevenueTrend,
  ProductPerformance,
} from '@/services/admin';
import { toast } from 'sonner';

interface AnalyticsData {
  revenue: RevenueMetrics | null;
  orders: OrderMetrics | null;
  customers: CustomerMetrics | null;
  products: ProductPerformance[];
  trends: RevenueTrend[];
}

export function useAnalyticsData() {
  const [data, setData] = useState<AnalyticsData>({
    revenue: null,
    orders: null,
    customers: null,
    products: [],
    trends: [],
  });
  const [dateRange, setDateRangeState] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    try {
      setIsLoading(!silent);
      setIsRefreshing(silent);

      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - parseInt(dateRange) * 86400000)
        .toISOString()
        .split('T')[0];

      const [revenueData, ordersData, customersData, productsData, trendsData] =
        await Promise.all([
          adminService.getRevenueMetrics(startDate, endDate).then((r) => r.data),
          adminService.getOrderAnalytics().then((r) => r.data),
          adminService.getCustomerAnalytics().then((r) => r.data),
          adminService.getProductPerformance(10).then((r) => r.data?.products ?? []),
          adminService.getRevenueTrends(12),
        ]);

      setData({
        revenue: revenueData,
        orders: ordersData,
        customers: customersData,
        products: productsData,
        trends: trendsData,
      });
    } catch {
      toast.error('Gagal memuat data analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const setDateRange = (range: string) => {
    setDateRangeState(range);
  };

  const refresh = () => {
    loadData(true);
  };

  return {
    ...data,
    dateRange,
    setDateRange,
    isLoading,
    isRefreshing,
    refresh,
  };
}
