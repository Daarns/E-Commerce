import { useCallback, useEffect, useState } from 'react';
import { adminService, AdminUser, UserMetrics, UserFilters } from '@/services/admin';
import { handleError } from '@/utils/error-handler';

interface UseAdminUsersReturn {
  users: AdminUser[];
  metrics: UserMetrics | null;
  isLoading: boolean;
  filters: UserFilters;
  page: number;
  handleFilterChange: (newFilters: UserFilters) => void;
  handleReset: () => void;
  setPage: (page: number) => void;
}

export function useAdminUsers(): UseAdminUsersReturn {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [metrics, setMetrics] = useState<UserMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({});
  const [page, setPage] = useState(1);

  const loadData = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const [usersData, metricsData] = await Promise.all([
        adminService.getUsers(filters, page, 20),
        adminService.getUserMetrics(),
      ]);
      setUsers(usersData.data || []);
      setMetrics(metricsData);
    } catch (error) {
      handleError(error, { context: 'Failed to load users' });
    } finally {
      setIsLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleFilterChange = (newFilters: UserFilters): void => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleReset = (): void => {
    setFilters({});
    setPage(1);
  };

  return {
    users,
    metrics,
    isLoading,
    filters,
    page,
    handleFilterChange,
    handleReset,
    setPage,
  };
}
