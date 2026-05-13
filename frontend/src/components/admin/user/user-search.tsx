'use client';

import { useState } from 'react';
import { UserFilters } from '@/services/admin';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, X } from 'lucide-react';

interface UserSearchProps {
  onFilterChange: (filters: UserFilters) => void;
  onReset?: () => void;
}

export function UserSearch({ onFilterChange, onReset }: UserSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<UserFilters>({});

  const handleStatusChange = (status: string) => {
    const newFilters = {
      ...filters,
      status: status === 'all' ? undefined : (status as 'active' | 'suspended' | 'banned'),
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleRoleChange = (role: string) => {
    const newFilters = {
      ...filters,
      role: role === 'all' ? undefined : (role as 'customer' | 'admin'),
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleSearchChange = (search: string) => {
    const newFilters = {
      ...filters,
      search: search || undefined,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleDateChange = (type: 'createdAfter' | 'createdBefore' | 'lastLoginAfter' | 'lastLoginBefore', value: string) => {
    const newFilters = {
      ...filters,
      [type]: value || undefined,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleReset = () => {
    setFilters({});
    onReset?.();
  };

  const hasActiveFilters = Object.values(filters).some((v) => v !== undefined);

  return (
    <div className="bg-white rounded-lg border p-4">
      {/* Header with toggle */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">Filters & Search</h3>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-1 text-gray-600 hover:text-gray-900"
        >
          <ChevronDown
            className={`w-5 h-5 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <Input
          type="text"
          placeholder="Search by name or email..."
          value={filters.search || ''}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="w-full"
        />
      </div>

      {/* Collapsible Filters */}
      {isExpanded && (
        <div className="space-y-4">
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
            <select
              value={filters.status || 'all'}
              onChange={(e) => handleStatusChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
              <option value="banned">Banned</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              value={filters.role || 'all'}
              onChange={(e) => handleRoleChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Roles</option>
              <option value="customer">Customer</option>
              <option value="admin">Admin</option>
            </select>
          </div>

          {/* Joined Date Filter */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Joined After</label>
              <Input
                type="date"
                value={filters.createdAfter || ''}
                onChange={(e) => handleDateChange('createdAfter', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Joined Before</label>
              <Input
                type="date"
                value={filters.createdBefore || ''}
                onChange={(e) => handleDateChange('createdBefore', e.target.value)}
              />
            </div>
          </div>

          {/* Last Login Filter */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Login After</label>
              <Input
                type="date"
                value={filters.lastLoginAfter || ''}
                onChange={(e) => handleDateChange('lastLoginAfter', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Last Login Before</label>
              <Input
                type="date"
                value={filters.lastLoginBefore || ''}
                onChange={(e) => handleDateChange('lastLoginBefore', e.target.value)}
              />
            </div>
          </div>

          {/* Reset Button */}
          {hasActiveFilters && (
            <Button
              variant="outline"
              onClick={handleReset}
              className="w-full flex items-center justify-center gap-2"
            >
              <X className="w-4 h-4" />
              Clear Filters
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
