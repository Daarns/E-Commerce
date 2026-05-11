import { Suspense } from 'react';
import { adminService } from '@/services/admin';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OrderDetailActions } from '@/components/admin/order-detail-actions';
import { OrderItemsSection } from '@/components/admin/OrderItemsSection';
import { ShippingAddressSection } from '@/components/admin/ShippingAddressSection';
import { PaymentInfoSection } from '@/components/admin/PaymentInfoSection';
import { OrderSummarySection } from '@/components/admin/OrderSummarySection';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Metadata } from 'next';
import { formatDate } from '@/utils';

async function OrderDetailContent({ orderId }: { orderId: string }) {
  let order;

  // ✅ try/catch hanya untuk data fetching, bukan JSX
  try {
    order = await adminService.getOrder(orderId);
  } catch (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <p className="text-gray-600">Failed to load order details</p>
        </div>
      </div>
    );
  }

  // ✅ JSX rendering di luar try/catch
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-6xl px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <Link href="/admin/orders">
            <Button variant="ghost" className="mb-4 gap-2">
              <ChevronLeft className="h-4 w-4" />
              Back to Orders
            </Button>
          </Link>

          <div className="flex items-start justify-between">
            <div>
              <h1 className="mb-2 text-3xl font-bold text-gray-900">
                Order #{order.order_number}
              </h1>
              <p className="text-gray-600">Placed on {formatDate(order.created_at)}</p>
            </div>
            <div className="text-right">
              <Badge className="mb-2 bg-blue-100 text-blue-800">
                {(order.status || order.order_status)?.toUpperCase()}
              </Badge>
              <p className="text-sm text-gray-600">Status</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            <OrderItemsSection items={order.items} />

            <ShippingAddressSection
              address={order.shipping_address}
              name={order.shipping_name}
              phone={order.shipping_phone}
              trackingNumber={order.tracking_number}
            />
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            <PaymentInfoSection method={order.payment_method} status={order.payment_status} />

            <OrderSummarySection
              subtotal={order.subtotal}
              shippingCost={order.shipping_cost}
              discountAmount={order.discount_amount}
              taxAmount={order.tax_amount}
              total={order.total_amount || order.total}
            />

            <OrderDetailActions order={order} />
          </div>
        </div>
      </div>
    </div>
  );
}

interface OrderDetailPageProps {
  params: Promise<{
    id: string;
  }>;
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps): Promise<React.ReactElement> {
  const { id } = await params;

  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center bg-gray-50">
          <div className="text-center">
            <div className="mb-4 inline-block h-12 w-12 animate-spin rounded-full border-b-2 border-gray-900" />
            <p className="text-gray-600">Loading order details...</p>
          </div>
        </div>
      }
    >
      <OrderDetailContent orderId={id} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: OrderDetailPageProps): Promise<Metadata> {
  const { id } = await params;

  return {
    title: `Order #${id} - Admin`,
    description: 'View and manage order details',
  };
}