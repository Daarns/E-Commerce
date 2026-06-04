'use client';

import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { OrderPagination } from '@/components/admin/order/OrderPagination';
import { RefundRequestTable } from '@/components/admin/order/refund-request-table';
import { useAdminRefundRequests } from '@/hooks/useAdminRefundRequests';

export default function AdminRefundRequestsPage(): React.ReactElement {
  const {
    orders,
    isLoading,
    currentPage,
    itemsPerPage,
    handlePreviousPage,
    handleNextPage,
  } = useAdminRefundRequests();

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Refund Requests</h1>
          <p className="mt-2 text-gray-600">
            Review bukti dan alasan refund sebelum memproses pengembalian dana.
          </p>
        </div>

        <RefundRequestTable orders={orders} isLoading={isLoading} />

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
