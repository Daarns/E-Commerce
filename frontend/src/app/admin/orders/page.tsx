'use client';

import { useState, useEffect } from 'react';
import { adminService, OrderFilters, AdminOrderMetrics, AdminOrder } from '@/services/admin';
import { OrderTable } from '@/components/admin/order-table';
import { OrderSearch } from '@/components/admin/order-search';
import { Card } from '@/components/ui/card';
import { TrendingUp, Package, CheckCircle, DollarSign } from 'lucide-react';

export default function AdminOrdersPage() {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [metrics, setMetrics] = useState<AdminOrderMetrics | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState<OrderFilters>({});

  useEffect(() => {
    loadOrders();
    loadMetrics();
  }, [filters, currentPage]);

  const loadOrders = async () => {
    try {
      setIsLoading(true);
      const result = await adminService.getOrders({
        ...filters,
        page: currentPage,
        limit: 20,
      });
      setOrders(result.orders);
    } catch (error) {
      console.error('Failed to load orders:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadMetrics = async () => {
    try {
      const data = await adminService.getOrderMetrics();
      setMetrics(data);
    } catch (error) {
      console.error('Failed to load metrics:', error);
    }
  };

  const handleFilterChange = (newFilters: OrderFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
  };

  const handleReset = () => {
    setFilters({});
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
        <p className="text-gray-600 mt-2">Manage and track customer orders</p>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Orders</p>
                <p className="text-3xl font-bold text-gray-900">{metrics.total_orders}</p>
              </div>
              <Package className="w-8 h-8 text-blue-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Pending Orders</p>
                <p className="text-3xl font-bold text-yellow-600">
                  {metrics.pending_count}
                </p>
              </div>
              <TrendingUp className="w-8 h-8 text-yellow-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Delivered Orders</p>
                <p className="text-3xl font-bold text-green-600">
                  {metrics.delivered_count}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </Card>

          <Card className="p-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  Rp {(metrics.total_revenue / 1000000).toFixed(1)}M
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-500" />
            </div>
          </Card>
        </div>
      )}

      {/* Search & Filters */}
      <OrderSearch onFilterChange={handleFilterChange} onReset={handleReset} />

      {/* Orders Table */}
      <OrderTable orders={orders} isLoading={isLoading} />

      {/* Pagination */}
      {orders.length > 0 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Showing {orders.length > 0 ? (currentPage - 1) * 20 + 1 : 0} -{' '}
            {Math.min(currentPage * 20, 999)} orders
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              className="px-3 py-2 border rounded-lg disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-2 text-sm">Page {currentPage}</span>
            <button
              onClick={() => setCurrentPage((p) => p + 1)}
              disabled={orders.length < 20}
              className="px-3 py-2 border rounded-lg disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
