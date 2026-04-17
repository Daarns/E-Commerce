'use client';

import { UserActivity } from '@/services/admin';
import { Clock } from 'lucide-react';

interface ActivityTimelineProps {
  activities: UserActivity[];
  isLoading?: boolean;
}

function getActivityIcon(action: string) {
  switch (action) {
    case 'login':
      return '🔓';
    case 'logout':
      return '🔒';
    case 'purchase':
      return '🛍️';
    case 'profile_update':
      return '👤';
    case 'password_change':
      return '🔑';
    case 'account_created':
      return '✨';
    default:
      return '📌';
  }
}

function formatActionLabel(action: string): string {
  const labels: Record<string, string> = {
    login: 'Logged in',
    logout: 'Logged out',
    purchase: 'Made a purchase',
    profile_update: 'Updated profile',
    password_change: 'Changed password',
    account_created: 'Account created',
  };
  return labels[action] || action;
}

export function ActivityTimeline({ activities, isLoading }: ActivityTimelineProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (activities.length === 0) {
    return (
      <div className="text-center py-12">
        <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-gray-500">No activity recorded</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {activities.map((activity, index) => (
        <div key={activity.id} className="flex gap-4">
          {/* Timeline indicator */}
          <div className="flex flex-col items-center">
            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">
              {getActivityIcon(activity.action)}
            </div>
            {index < activities.length - 1 && (
              <div className="w-0.5 h-12 bg-gray-200 mt-2" />
            )}
          </div>

          {/* Activity content */}
          <div className="flex-1 pt-2">
            <p className="font-medium text-gray-900">
              {formatActionLabel(activity.action)}
            </p>
            <p className="text-sm text-gray-500">
              {new Date(activity.timestamp).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })}
            </p>
            {activity.details && (
              <p className="text-sm text-gray-600 mt-1">{activity.details}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
