import { useCallback, useEffect, useState } from 'react';
import { adminService, DashboardSummary } from '@/services/admin';
import { handleError } from '@/utils/error-handler';

interface UseAdminDashboardReturn {
  summary: DashboardSummary | null;
  isLoading: boolean;
  isRefreshing: boolean;
  fetchDashboard: (silent?: boolean) => Promise<void>;
}

export function useAdminDashboard(): UseAdminDashboardReturn {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchDashboard = useCallback(async (silent = false): Promise<void> => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);
      const data = await adminService.getDashboardSummary();
      setSummary(data);
    } catch (error) {
      handleError(error, { context: 'Failed to fetch dashboard' });
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  return {
    summary,
    isLoading,
    isRefreshing,
    fetchDashboard,
  };
}
