'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { adminService, AdminUser } from '@/services/admin';
import { ActivityTimeline } from '@/components/admin/activity-timeline';
import { UserDetailActions } from '@/components/admin/user-detail-actions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [user, setUser] = useState<AdminUser | null>(null);
  const [activities, setActivities] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      setIsLoading(true);
      const [userData, activitiesData] = await Promise.all([
        adminService.getUser(params.id),
        adminService.getUserActivityLog(params.id, 20),
      ]);
      setUser(userData);
      setActivities(activitiesData);
    } catch (error) {
      console.error('Failed to load user:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRoleUpdate = async (newRole: 'customer' | 'admin') => {
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await adminService.updateUserRole(user.id, newRole);
      setUser(updated);
    } catch (error) {
      console.error('Failed to update role:', error);
      alert('Failed to update role');
    } finally {
      setIsSaving(false);
    }
  };

  const handleStatusUpdate = async (newStatus: 'active' | 'suspended' | 'banned', reason?: string) => {
    if (!user) return;
    setIsSaving(true);
    try {
      const updated = await adminService.updateUserStatus(user.id, newStatus, reason);
      setUser(updated);
    } catch (error) {
      console.error('Failed to update status:', error);
      alert('Failed to update status');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
        <p className="text-red-800">User not found</p>
        <Link href="/admin/users">
          <Button variant="outline" className="mt-4">Back to Users</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/admin/users">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{user.name}</h1>
            <p className="text-gray-600">{user.email}</p>
          </div>
        </div>
      </div>

      {/* User Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Basic Info */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Account Information</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Role</p>
              <Badge className={user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}>
                {user.role === 'admin' ? 'Admin' : 'Customer'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Status</p>
              <Badge className={
                user.status === 'active' ? 'bg-green-100 text-green-800' :
                user.status === 'suspended' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }>
                {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Phone</p>
              <p className="text-gray-900">{user.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Email Verified</p>
              <Badge className={user.is_verified ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}>
                {user.is_verified ? 'Verified' : 'Not Verified'}
              </Badge>
            </div>
          </div>
        </div>

        {/* Activity Info */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Activity</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Joined</p>
              <p className="text-gray-900">{new Date(user.created_at).toLocaleDateString('id-ID')}</p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Last Login</p>
              <p className="text-gray-900">
                {user.last_login
                  ? new Date(user.last_login).toLocaleDateString('id-ID')
                  : 'Never'}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Total Orders</p>
              <p className="text-gray-900 text-2xl font-bold">{user.total_orders}</p>
            </div>
          </div>
        </div>

        {/* Purchase Info */}
        <div className="bg-white rounded-lg border p-6">
          <h2 className="font-semibold text-gray-900 mb-4">Purchase History</h2>
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Total Spent</p>
              <p className="text-gray-900 text-2xl font-bold">
                Rp {user.total_spent.toLocaleString('id-ID')}
              </p>
            </div>
            <div>
              <p className="text-sm text-gray-600">Average Order Value</p>
              <p className="text-gray-900">
                Rp {user.total_orders > 0 
                  ? Math.round(user.total_spent / user.total_orders).toLocaleString('id-ID')
                  : '0'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Management Actions</h2>
        <UserDetailActions
          user={user}
          onRoleUpdate={handleRoleUpdate}
          onStatusUpdate={handleStatusUpdate}
        />
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-lg border p-6">
        <h2 className="font-semibold text-gray-900 mb-4">Activity Timeline</h2>
        <ActivityTimeline activities={activities} />
      </div>
    </div>
  );
}
