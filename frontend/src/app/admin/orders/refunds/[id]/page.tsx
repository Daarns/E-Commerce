'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { AlertCircle, ChevronLeft } from 'lucide-react';
import { adminService, type AdminOrder } from '@/services/admin';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderItemsSection } from '@/components/admin/order/OrderItemsSection';
import { PaymentInfoSection } from '@/components/admin/order/PaymentInfoSection';
import { OrderSummarySection } from '@/components/admin/order/OrderSummarySection';
import { ShippingAddressSection } from '@/components/admin/order/ShippingAddressSection';
import { RefundReviewPanel } from '@/components/admin/order/refund-review-panel';
import { formatDate } from '@/utils';
import { ADMIN_ORDER_STATUS_LABELS } from '@/constants/order.constants';

export default function AdminRefundReviewPage(): React.ReactElement {
  const params = useParams();
  const orderId = params.id as string;
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOrder = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      setError(null);
      const data = await adminService.getOrder(orderId);
      setOrder(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load refund detail');
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    if (orderId) {
      void fetchOrder();
    }
  }, [fetchOrder, orderId]);

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <div className="mb-4 inline-block h-10 w-10 animate-spin rounded-full border-b-2 border-gray-900" />
            <p className="text-sm text-gray-600">Loading refund detail...</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  if (error || !order) {
    return (
      <AdminLayout>
        <div className="flex h-96 items-center justify-center">
          <div className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <p className="text-sm text-gray-600">{error || 'Failed to load refund detail'}</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <div className="mx-auto max-w-6xl space-y-6">
        <div>
          <Link href="/admin/orders/refunds">
            <Button variant="ghost" className="mb-4 gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Refund Requests
            </Button>
          </Link>

          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                Refund #{order.order_number}
              </h1>
              <p className="mt-2 text-gray-600">Order placed on {formatDate(order.created_at)}</p>
            </div>
            <Badge className="w-fit bg-orange-100 text-orange-800">
              {ADMIN_ORDER_STATUS_LABELS[order.status || order.order_status]}
            </Badge>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <RefundReviewPanel order={order} onRefundProcessed={fetchOrder} />
            <OrderItemsSection items={order.items} />
          </div>

          <div className="space-y-6">
            <PaymentInfoSection method={order.payment_method} status={order.payment_status} />
            <ShippingAddressSection
              address={order.shipping_address}
              name={order.shipping_name}
              phone={order.shipping_phone}
              trackingNumber={order.tracking_number}
            />
            <OrderSummarySection
              subtotal={order.subtotal}
              shippingCost={order.shipping_cost}
              discountAmount={order.discount_amount}
              taxAmount={order.tax_amount}
              total={order.total_amount || order.total}
            />
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
