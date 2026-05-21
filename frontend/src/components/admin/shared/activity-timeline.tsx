'use client';

import { useState } from 'react';
import { UserActivity } from '@/services/admin';
import { Clock, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ADMIN_USER_ACTIVITY_LABELS,
  ADMIN_USER_ACTIVITY_TYPES,
} from '@/constants/admin-user.constants';

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
    case 'payment_process':
      return '💳';
    default:
      return '📌';
  }
}

function formatActionLabel(action: string): string {
  return ADMIN_USER_ACTIVITY_LABELS[action] || action;
}

export function ActivityTimeline({ activities, isLoading }: ActivityTimelineProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [selectedActionFilter, setSelectedActionFilter] = useState<string>('');
  const [dateRangeFilter, setDateRangeFilter] = useState<{
    startDate: string;
    endDate: string;
  }>({ startDate: '', endDate: '' });

  // Filter activities based on selected filters
  const filteredActivities = activities.filter((activity) => {
    // Filter by action type
    if (selectedActionFilter && activity.action !== selectedActionFilter) {
      return false;
    }

    // Filter by date range
    if (dateRangeFilter.startDate || dateRangeFilter.endDate) {
      const activityDate = new Date(activity.timestamp);

      if (dateRangeFilter.startDate) {
        const startDate = new Date(dateRangeFilter.startDate);
        if (activityDate < startDate) {
          return false;
        }
      }

      if (dateRangeFilter.endDate) {
        const endDate = new Date(dateRangeFilter.endDate);
        endDate.setHours(23, 59, 59, 999); // Include entire day
        if (activityDate > endDate) {
          return false;
        }
      }
    }

    return true;
  });

  const handleReset = () => {
    setSelectedActionFilter('');
    setDateRangeFilter({ startDate: '', endDate: '' });
  };

  const hasActiveFilters = selectedActionFilter || dateRangeFilter.startDate || dateRangeFilter.endDate;

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
      {/* Filter Section */}
      <div className="bg-gray-50 rounded-lg border p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900">Activity Filters</h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
          >
            <ChevronDown
              className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-3">
            {/* Activity Type Filter */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Action Type</label>
              <select
                value={selectedActionFilter}
                onChange={(e) => setSelectedActionFilter(e.target.value)}
                className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Actions</option>
                {ADMIN_USER_ACTIVITY_TYPES.map((type) => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Filter */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">From Date</label>
                <input
                  type="date"
                  value={dateRangeFilter.startDate}
                  onChange={(e) =>
                    setDateRangeFilter({ ...dateRangeFilter, startDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">To Date</label>
                <input
                  type="date"
                  value={dateRangeFilter.endDate}
                  onChange={(e) =>
                    setDateRangeFilter({ ...dateRangeFilter, endDate: e.target.value })
                  }
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <Button
                variant="outline"
                onClick={handleReset}
                className="w-full"
              >
                Clear Filters
              </Button>
            )}
          </div>
        )}

        {/* Filter Summary */}
        {hasActiveFilters && (
          <div className="mt-3 text-sm text-gray-600">
            <p>
              Showing {filteredActivities.length} of {activities.length} activities
            </p>
          </div>
        )}
      </div>

      {/* Timeline */}
      <div className="space-y-6">
        {filteredActivities.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-gray-500">No activities match the selected filters</p>
          </div>
        ) : (
          filteredActivities.map((activity, index) => (
            <div key={activity.id} className="flex gap-4">
              {/* Timeline indicator */}
              <div className="flex flex-col items-center">
                <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-lg">
                  {getActivityIcon(activity.action)}
                </div>
                {index < filteredActivities.length - 1 && (
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
          ))
        )}
      </div>
    </div>
  );
}
