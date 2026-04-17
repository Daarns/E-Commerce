'use client';

import { useState } from 'react';
import { OrderFilters } from '@/services/admin';
import { OrderStatus, PaymentStatus } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChevronDown, X } from 'lucide-react';

interface OrderSearchProps {
  onFilterChange: (filters: OrderFilters) => void;
  onReset?: () => void;
}

export function OrderSearch({ onFilterChange, onReset }: OrderSearchProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [filters, setFilters] = useState<OrderFilters>({});

  const handleStatusChange = (status: string) => {
    const newFilters = {
      ...filters,
      status: status === 'all' ? undefined : (status as OrderStatus),
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handlePaymentStatusChange = (paymentStatus: string) => {
    const newFilters = {
      ...filters,
      payment_status: paymentStatus === 'all' ? undefined : (paymentStatus as PaymentStatus),
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

  const handleDateChange = (type: 'start_date' | 'end_date', value: string) => {
    const newFilters = {
      ...filters,
      [type]: value || undefined,
    };
    setFilters(newFilters);
    onFilterChange(newFilters);
  };

  const handleAmountChange = (type: 'min_amount' | 'max_amount', value: string) => {
    const newFilters = {
      ...filters,
      [type]: value ? parseFloat(value) : undefined,
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
          placeholder="Search by order number or customer name..."
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
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
              <option value="processing">Processing</option>
              <option value="shipped">Shipped</option>
              <option value="delivered">Delivered</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </select>
          </div>

          {/* Payment Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Status</label>
            <select
              value={filters.payment_status || 'all'}
              onChange={(e) => handlePaymentStatusChange(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">All Payment Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
              <option value="failed">Failed</option>
              <option value="refunded">Refunded</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          {/* Date Range Filter */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
              <Input
                type="date"
                value={filters.start_date || ''}
                onChange={(e) => handleDateChange('start_date', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
              <Input
                type="date"
                value={filters.end_date || ''}
                onChange={(e) => handleDateChange('end_date', e.target.value)}
              />
            </div>
          </div>

          {/* Amount Range Filter */}
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Min Amount</label>
              <Input
                type="number"
                placeholder="0"
                value={filters.min_amount || ''}
                onChange={(e) => handleAmountChange('min_amount', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Max Amount</label>
              <Input
                type="number"
                placeholder="999999999"
                value={filters.max_amount || ''}
                onChange={(e) => handleAmountChange('max_amount', e.target.value)}
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
