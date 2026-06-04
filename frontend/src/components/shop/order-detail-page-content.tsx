'use client';

import Link from 'next/link';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { OrderTimeline } from '@/components/shop/order-timeline';
import { PaymentStatusSection } from '@/components/shop/payment-status-section';
import { ShippingAddressSection } from '@/components/shop/shipping-address-section';
import { OrderItemsList } from '@/components/shop/order-items-list';
import { OrderActions } from '@/components/shop/order-actions';
import { useOrderDetail } from '@/hooks/useOrderDetail';

interface OrderDetailPageContentProps {
  orderId: string;
}

export function OrderDetailPageContent({ orderId }: OrderDetailPageContentProps) {
  const { order, isLoading, error, setOrder } = useOrderDetail(orderId);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-3xl mx-auto px-4 py-16 text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Order not found</h1>
          <p className="text-gray-600 mb-6">
            {error ?? 'The order could not be loaded. Please try again from your orders page.'}
          </p>
          <Button asChild>
            <Link href="/orders">Back to Orders</Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="mb-8">
          <Button asChild variant="ghost" className="mb-4 gap-2">
            <Link href="/orders">
              <ChevronLeft className="w-4 h-4" />
              Back to Orders
            </Link>
          </Button>

          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Order #{order.order_number}
            </h1>
            <p className="text-gray-600">
              Placed on {new Date(order.created_at).toLocaleDateString('id-ID', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <OrderItemsList order={order} />
            <OrderTimeline order={order} />
            <ShippingAddressSection order={order} />
          </div>

          <div className="space-y-6">
            <PaymentStatusSection order={order} />
            <OrderActions order={order} onOrderUpdated={setOrder} />
          </div>
        </div>
      </div>
    </div>
  );
}
