'use client';

import { useState, useEffect } from 'react';
import { adminService, UserFilters } from '@/services/admin';
import { UserSearch } from '@/components/admin/user-search';
import { UserTable } from '@/components/admin/user-table';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState<UserFilters>({});
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadData();
  }, [filters, page]);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [usersData, metricsData] = await Promise.all([
        adminService.getUsers(filters, page, 20),
        adminService.getUserMetrics(),
      ]);
      setUsers(usersData.data || []);
      setMetrics(metricsData);
    } catch (error) {
      console.error('Failed to load users:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleFilterChange = (newFilters: UserFilters) => {
    setFilters(newFilters);
    setPage(1);
  };

  const handleReset = () => {
    setFilters({});
    setPage(1);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">Manage user accounts, roles, and permissions</p>
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-2">Total Users</div>
          <div className="text-3xl font-bold text-gray-900">
            {metrics?.total_users || 0}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-2">Active</div>
          <div className="text-3xl font-bold text-green-600">
            {metrics?.active_users || 0}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-2">Suspended</div>
          <div className="text-3xl font-bold text-yellow-600">
            {metrics?.suspended_users || 0}
          </div>
        </div>

        <div className="bg-white rounded-lg border p-6">
          <div className="text-sm text-gray-600 mb-2">Banned</div>
          <div className="text-3xl font-bold text-red-600">
            {metrics?.banned_users || 0}
          </div>
        </div>
      </div>

      {/* User List */}
      <div className="space-y-4">
        <UserSearch
          onFilterChange={handleFilterChange}
          onReset={handleReset}
        />
        <UserTable users={users} isLoading={isLoading} />
      </div>
    </div>
  );
}
