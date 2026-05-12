'use client';

import { useAdminUsers } from '@/hooks/useAdminUsers';
import { UserSearch } from '@/components/admin/user-search';
import { UserTable } from '@/components/admin/user-table';
import { UserMetricsCard } from '@/components/admin/user-metrics-card';
import { AdminLayout } from '@/components/admin/layout';

export default function UsersPage() {
  const { users, metrics, isLoading, handleFilterChange, handleReset } = useAdminUsers();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600 mt-2">Manage user accounts, roles, and permissions</p>
        </div>

        {/* Metrics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <UserMetricsCard label="Total Users" value={metrics?.total_users} color="gray" />
          <UserMetricsCard label="Active" value={metrics?.active_users} color="green" />
          <UserMetricsCard label="Suspended" value={metrics?.suspended_users} color="yellow" />
          <UserMetricsCard label="Banned" value={metrics?.banned_users} color="red" />
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
    </AdminLayout>
  );
}
