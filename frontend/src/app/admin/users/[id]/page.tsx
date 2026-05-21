'use client';

import Link from 'next/link';
import { useUserDetail } from '@/hooks/useUserDetail';
import { ActivityTimeline } from '@/components/admin/shared/activity-timeline';
import { UserDetailActions } from '@/components/admin/user/user-detail-actions';
import { UserInfoCard } from '@/components/admin/user/user-info-card';
import { UserDetailLoading } from '@/components/admin/user/user-detail-loading';
import { UserDetailError } from '@/components/admin/user/user-detail-error';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ArrowLeft } from 'lucide-react';
import { formatCurrency } from '@/utils';

export default function UserDetailPage({ params }: { params: { id: string } }) {
  const { user, activities, isLoading, handleRoleUpdate, handleStatusUpdate } = useUserDetail(params.id);

  if (isLoading) return <UserDetailLoading />;
  if (!user) return <UserDetailError />;

  const roleVariant = user.role === 'admin' ? 'default' : 'secondary';
  const statusVariant = user.status === 'active' ? 'default' : user.status === 'suspended' ? 'secondary' : 'destructive';
  const verifiedVariant = user.is_verified ? 'default' : 'secondary';

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
            <h1 className="text-3xl font-bold">{user.name}</h1>
            <p className="text-muted-foreground">{user.email}</p>
          </div>
        </div>
      </div>

      {/* User Info Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <UserInfoCard
          title="Account Information"
          items={[
            { label: 'Role', value: <Badge variant={roleVariant}>{user.role === 'admin' ? 'Admin' : 'Customer'}</Badge> },
            { label: 'Status', value: <Badge variant={statusVariant}>{user.status.charAt(0).toUpperCase() + user.status.slice(1)}</Badge> },
            { label: 'Phone', value: user.phone || 'Not provided' },
            { label: 'Email Verified', value: <Badge variant={verifiedVariant}>{user.is_verified ? 'Verified' : 'Not Verified'}</Badge> },
          ]}
        />

        <UserInfoCard
          title="Activity"
          items={[
            { label: 'Joined', value: new Date(user.created_at).toLocaleDateString('id-ID') },
            { label: 'Last Login', value: user.last_login ? new Date(user.last_login).toLocaleDateString('id-ID') : 'Never' },
            { label: 'Total Orders', value: <span className="text-2xl font-bold">{user.total_orders}</span> },
          ]}
        />

        <UserInfoCard
          title="Purchase History"
          items={[
            { label: 'Total Spent', value: <span className="text-2xl font-bold">{formatCurrency(user.total_spent)}</span> },
            { label: 'Average Order Value', value: formatCurrency(user.total_orders > 0 ? Math.round(user.total_spent / user.total_orders) : 0) },
          ]}
        />
      </div>

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Management Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <UserDetailActions
            user={user}
            onRoleUpdate={handleRoleUpdate}
            onStatusUpdate={handleStatusUpdate}
          />
        </CardContent>
      </Card>

      {/* Activity Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline activities={activities} />
        </CardContent>
      </Card>
    </div>
  );
}
