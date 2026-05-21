import { Suspense } from 'react';
import { notFound } from 'next/navigation';
import { orderService } from '@/services/order';
import { OrderTimeline } from '@/components/shop/order-timeline';
import { PaymentStatusSection } from '@/components/shop/payment-status-section';
import { ShippingAddressSection } from '@/components/shop/shipping-address-section';
import { OrderItemsList } from '@/components/shop/order-items-list';
import { OrderActions } from '@/components/shop/order-actions';
import { Button } from '@/components/ui/button';
import { ChevronLeft } from 'lucide-react';
import Link from 'next/link';

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

async function OrderDetailContent({ orderId }: { orderId: string }) {
  let order;

  try {
    order = await orderService.getOrder(orderId);
  } catch (error) {
    console.error('Error fetching order:', error);
    notFound();
  }

  if (!order) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/orders">
            <Button variant="ghost" className="mb-4 gap-2">
              <ChevronLeft className="w-4 h-4" />
              Back to Orders
            </Button>
          </Link>

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
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Order Items */}
            <OrderItemsList order={order} />

            {/* Shipping Address */}
            <ShippingAddressSection order={order} />

            {/* Order Timeline */}
            <OrderTimeline order={order} />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Payment Status */}
            <PaymentStatusSection order={order} />

            {/* Order Actions */}
            <OrderActions order={order} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4" />
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
      }
    >
      <OrderDetailContent orderId={params.id} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: OrderDetailPageProps) {
  return {
    title: `Order #${params.id} - E-Commerce Store`,
    description: 'View your order details, status, and tracking information.',
  };
}
