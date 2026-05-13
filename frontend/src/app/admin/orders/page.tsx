'use client';

import { useAdminOrders } from '@/hooks/useAdminOrders';
import { OrderTable } from '@/components/admin/order/order-table';
import { OrderSearch } from '@/components/admin/order/order-search';
import { OrderMetrics } from '@/components/admin/order/OrderMetrics';
import { OrderPagination } from '@/components/admin/order/OrderPagination';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';

export default function AdminOrdersPage(): React.ReactElement {
  const {
    orders,
    metrics,
    isLoading,
    currentPage,
    handleFilterChange,
    handleReset,
    handlePreviousPage,
    handleNextPage,
    itemsPerPage,
  } = useAdminOrders();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-2">Manage and track customer orders</p>
        </div>

        <OrderMetrics metrics={metrics} />

        <OrderSearch onFilterChange={handleFilterChange} onReset={handleReset} />

        <OrderTable orders={orders} isLoading={isLoading} />

        {orders.length > 0 && (
          <OrderPagination
            currentPage={currentPage}
            itemsCount={orders.length}
            itemsPerPage={itemsPerPage}
            onPreviousPage={handlePreviousPage}
            onNextPage={handleNextPage}
          />
        )}
      </div>
    </AdminLayout>
  );
}
