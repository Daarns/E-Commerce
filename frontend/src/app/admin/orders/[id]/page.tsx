import { Suspense } from 'react';
import { adminService } from '@/services/admin';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { OrderDetailActions } from '@/components/admin/order-detail-actions';
import { ChevronLeft, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { Metadata } from 'next';

async function OrderDetailContent({ orderId }: { orderId: string }) {
  try {
    const order = await adminService.getOrder(orderId);

    return (
      <div className="min-h-screen bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Header */}
          <div className="mb-8">
            <Link href="/admin/orders">
              <Button variant="ghost" className="mb-4 gap-2">
                <ChevronLeft className="w-4 h-4" />
                Back to Orders
              </Button>
            </Link>
            
            <div className="flex items-start justify-between">
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
              <div className="text-right">
                <Badge className="bg-blue-100 text-blue-800 mb-2">
                  {order.status.toUpperCase()}
                </Badge>
                <p className="text-sm text-gray-600">Status</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-6">
              {/* Order Items */}
              <Card className="overflow-hidden">
                <div className="p-6 border-b bg-gray-50">
                  <h3 className="font-semibold text-gray-900">Order Items</h3>
                </div>
                <div className="divide-y">
                  {order.items.map((item) => (
                    <div key={item.id} className="p-6 flex gap-4">
                      <div className="relative w-16 h-16 bg-gray-100 rounded flex-shrink-0 overflow-hidden">
                        <Image
                          src={item.product_image || '/placeholder-product.jpg'}
                          alt={item.product_name}
                          fill
                          className="object-cover"
                        />
                      </div>
                      <div className="flex-1">
                        <p className="font-medium text-gray-900">{item.product_name}</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Qty: <span className="font-medium">{item.quantity}</span>
                        </p>
                        <p className="text-sm text-gray-500">
                          Unit Price: Rp {item.unit_price.toLocaleString('id-ID')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">
                          Rp {item.total_price.toLocaleString('id-ID')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>

              {/* Shipping Address */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Shipping Address</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Recipient</p>
                    <p className="font-medium">{order.shipping_address.recipient_name}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Phone</p>
                    <p className="font-medium">{order.shipping_address.phone}</p>
                  </div>
                  <div>
                    <p className="text-gray-600">Address</p>
                    <p className="font-medium">{order.shipping_address.street_address}</p>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-gray-600">City</p>
                      <p className="font-medium">{order.shipping_address.city}</p>
                    </div>
                    <div>
                      <p className="text-gray-600">Province</p>
                      <p className="font-medium">{order.shipping_address.province}</p>
                    </div>
                  </div>
                  {order.tracking_number && (
                    <div>
                      <p className="text-gray-600">Tracking Number</p>
                      <p className="font-mono">{order.tracking_number}</p>
                    </div>
                  )}
                </div>
              </Card>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Payment Info */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Payment Information</h3>
                <div className="space-y-3 text-sm">
                  <div>
                    <p className="text-gray-600">Method</p>
                    <p className="font-medium capitalize">
                      {order.payment_method?.replace('-', ' ') || 'N/A'}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-600">Status</p>
                    <Badge className={
                      order.payment_status === 'paid'
                        ? 'bg-green-100 text-green-800'
                        : 'bg-yellow-100 text-yellow-800'
                    }>
                      {order.payment_status.toUpperCase()}
                    </Badge>
                  </div>
                </div>
              </Card>

              {/* Order Summary */}
              <Card className="p-6">
                <h3 className="font-semibold text-gray-900 mb-4">Order Summary</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Subtotal</span>
                    <span>Rp {order.subtotal.toLocaleString('id-ID')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shipping</span>
                    <span>Rp {order.shipping_cost.toLocaleString('id-ID')}</span>
                  </div>
                  {order.discount_amount > 0 && (
                    <div className="flex justify-between text-green-600">
                      <span>Discount</span>
                      <span>-Rp {order.discount_amount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  {order.tax_amount > 0 && (
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tax</span>
                      <span>Rp {order.tax_amount.toLocaleString('id-ID')}</span>
                    </div>
                  )}
                  <div className="border-t pt-2 flex justify-between font-semibold">
                    <span>Total</span>
                    <span>Rp {order.total_amount.toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </Card>

              {/* Actions */}
              <OrderDetailActions order={order} />
            </div>
          </div>
        </div>
      </div>
    );
  } catch (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600">Failed to load order details</p>
        </div>
      </div>
    );
  }
}

interface OrderDetailPageProps {
  params: {
    id: string;
  };
}

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mb-4" />
          <p className="text-gray-600">Loading order details...</p>
        </div>
      </div>
    }>
      <OrderDetailContent orderId={params.id} />
    </Suspense>
  );
}

export async function generateMetadata({ params }: OrderDetailPageProps): Promise<Metadata> {
  return {
    title: `Order #${params.id} - Admin`,
    description: 'View and manage order details',
  };
}
