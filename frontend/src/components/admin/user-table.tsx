'use client';

import { AdminUser } from '@/services/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Edit2, Trash2, Download } from 'lucide-react';
import Link from 'next/link';
import { exportUsersToCSV } from '@/utils/csv-export';

interface UserTableProps {
  users: AdminUser[];
  isLoading?: boolean;
  onView?: (user: AdminUser) => void;
  onEdit?: (user: AdminUser) => void;
  onDelete?: (user: AdminUser) => void;
  onExport?: () => void;
}

function getStatusBadgeColor(status: 'active' | 'suspended' | 'banned'): string {
  switch (status) {
    case 'active':
      return 'bg-green-100 text-green-800';
    case 'suspended':
      return 'bg-yellow-100 text-yellow-800';
    case 'banned':
      return 'bg-red-100 text-red-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function getRoleBadgeColor(role: 'customer' | 'admin'): string {
  switch (role) {
    case 'admin':
      return 'bg-purple-100 text-purple-800';
    case 'customer':
      return 'bg-blue-100 text-blue-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

function formatStatusLabel(status: 'active' | 'suspended' | 'banned'): string {
  const labels: Record<'active' | 'suspended' | 'banned', string> = {
    active: 'Active',
    suspended: 'Suspended',
    banned: 'Banned',
  };
  return labels[status];
}

function formatRoleLabel(role: 'customer' | 'admin'): string {
  const labels: Record<'customer' | 'admin', string> = {
    customer: 'Customer',
    admin: 'Admin',
  };
  return labels[role];
}

export function UserTable({ users, isLoading, onView, onEdit, onDelete, onExport }: UserTableProps) {
  const handleExport = () => {
    exportUsersToCSV(users);
    onExport?.();
  };
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (users.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No users found</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Export button */}
      <div className="flex justify-end">
        <Button
          onClick={handleExport}
          variant="outline"
          className="flex items-center gap-2"
          title="Download users data as CSV"
        >
          <Download className="w-4 h-4" />
          Export to CSV
        </Button>
      </div>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Name</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Email</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Role</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Orders</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Last Login</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Joined</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {users.map((user) => (
              <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <p className="font-medium text-gray-900">{user.name}</p>
                </td>
                <td className="px-6 py-4">
                  <p className="text-sm text-gray-600">{user.email}</p>
                </td>
                <td className="px-6 py-4">
                  <Badge className={getRoleBadgeColor(user.role)}>
                    {formatRoleLabel(user.role)}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <Badge className={getStatusBadgeColor(user.status)}>
                    {formatStatusLabel(user.status)}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">
                  {user.total_orders} orders
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {user.last_login
                    ? new Date(user.last_login).toLocaleDateString('id-ID')
                    : 'Never'}
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(user.created_at).toLocaleDateString('id-ID')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/users/${user.id}`}>
                      <Button variant="ghost" size="icon" title="View User">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
    </div>
  );
}
