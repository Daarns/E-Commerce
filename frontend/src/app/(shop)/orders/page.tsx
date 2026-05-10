'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import {
  Package,
  Truck,
  CheckCircle,
  Clock,
  XCircle,
  Search,
  Eye,
  ShoppingBag,
  CreditCard,
  RefreshCcw,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/stores/auth-store';
import { orderService } from '@/services/order';
import { formatCurrency, formatDate } from '@/utils';
import { Order, OrderStatus } from '@/types';
import { toast } from 'sonner';
import api from '@/services/api';

// Helper: decimal strings from Go shopspring/decimal → number
function toNum(val: string | number | undefined): number {
  if (val === undefined || val === null) return 0;
  return typeof val === 'number' ? val : parseFloat(val) || 0;
}

const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; icon: React.ReactNode }
> = {
  pending: {
    label: 'Pending Payment',
    color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    icon: <Clock className="h-4 w-4" />,
  },
  payment_confirmed: {
    label: 'Payment Confirmed',
    color: 'bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200',
    icon: <CreditCard className="h-4 w-4" />,
  },
  processing: {
    label: 'Processing',
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    icon: <Package className="h-4 w-4" />,
  },
  shipped: {
    label: 'Shipped',
    color: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
    icon: <Truck className="h-4 w-4" />,
  },
  delivered: {
    label: 'Delivered',
    color: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
    icon: <CheckCircle className="h-4 w-4" />,
  },
  cancelled: {
    label: 'Cancelled',
    color: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    icon: <XCircle className="h-4 w-4" />,
  },
  refunded: {
    label: 'Refunded',
    color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
    icon: <RefreshCcw className="h-4 w-4" />,
  },
};

// Filter tabs
const STATUS_TABS = [
  'all',
  'pending',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;

type StatusTab = (typeof STATUS_TABS)[number];

function OrdersPageContent() {
  const searchParams = useSearchParams();
  const { isAuthenticated, user } = useAuthStore();

  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isCancelling, setIsCancelling] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusTab>('all');
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [showSuccessToast, setShowSuccessToast] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [isPayingOrder, setIsPayingOrder] = useState<string | null>(null);
  const [isSyncingOrder, setIsSyncingOrder] = useState<string | null>(null);

  // Check for success param (redirect from checkout)
  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setShowSuccessToast(true);
      setTimeout(() => setShowSuccessToast(false), 5000);
    }
  }, [searchParams]);

  // Fetch orders from API
  useEffect(() => {
    if (!isAuthenticated) return;

    async function fetchOrders() {
      setIsLoading(true);
      try {
        const result = await orderService.getOrders(currentPage, 20);
        setOrders(result.orders);
        setTotalPages(result.meta?.total_pages ?? 1);
      } catch (err) {
        console.error('Failed to fetch orders:', err);
        toast.error('Failed to load orders');
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrders();
  }, [isAuthenticated, currentPage]);

  // Client-side filter by search + status tab
  useEffect(() => {
    let result = [...orders];

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (order) =>
          order.order_number.toLowerCase().includes(q) ||
          order.items.some((item) =>
            item.product_name.toLowerCase().includes(q)
          )
      );
    }

    if (statusFilter !== 'all') {
      result = result.filter((order) => order.order_status === statusFilter);
    }

    setFilteredOrders(result);
  }, [orders, searchQuery, statusFilter]);

  const handleCancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order?')) return;
    setIsCancelling(orderId);
    try {
      const updated = await orderService.cancelOrder(orderId);
      setOrders((prev) => prev.map((o) => (o.id === updated.id ? updated : o)));
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
      toast.success('Order cancelled successfully');
    } catch (err) {
      console.error(err);
      toast.error('Failed to cancel order');
    } finally {
      setIsCancelling(null);
    }
  };

  const handlePayOrder = async (order: Order) => {
    setIsPayingOrder(order.id);
    try {
      const res = await api.post<{ data: { snap_token: string } }>(
        `/orders/${order.id}/pay`,
        { customer_email: user?.email ?? '' }
      );
      const snapToken = res.data.data?.snap_token;
      if (!snapToken) throw new Error('Token tidak tersedia');

      // Load Snap.js if not already loaded
      const snapUrl = process.env.NEXT_PUBLIC_MIDTRANS_SNAP_URL ||
        'https://app.sandbox.midtrans.com/snap/snap.js';
      if (!document.querySelector(`script[src="${snapUrl}"]`)) {
        await new Promise<void>((resolve, reject) => {
          const s = document.createElement('script');
          s.src = snapUrl;
          s.setAttribute('data-client-key', process.env.NEXT_PUBLIC_MIDTRANS_CLIENT_KEY || '');
          s.onload = () => resolve();
          s.onerror = () => reject(new Error('Failed to load Midtrans Snap'));
          document.body.appendChild(s);
        });
      }

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (window as any).snap.pay(snapToken, {
        onSuccess: () => {
          toast.success('Pembayaran berhasil!');
          setSelectedOrder(null);
          // Refresh orders
          setOrders([]);
          setCurrentPage(1);
        },
        onPending: () => {
          toast.info('Menunggu konfirmasi pembayaran...');
          setSelectedOrder(null);
        },
        onError: () => toast.error('Pembayaran gagal. Silakan coba lagi.'),
        onClose: () => setIsPayingOrder(null),
      });
    } catch (err) {
      toast.error('Gagal memuat pembayaran. Silakan coba lagi.');
      console.error(err);
    } finally {
      setIsPayingOrder(null);
    }
  };

  const handleSyncPayment = async (order: Order) => {
    setIsSyncingOrder(order.id);
    try {
      const result = await orderService.syncPayment(order.id);
      if (result.updated) {
        toast.success('Status pembayaran berhasil diperbarui!', {
          description: `Status Midtrans: ${result.transaction_status}`,
        });
        const refreshed = await orderService.getOrders(currentPage, 20);
        setOrders(refreshed.orders);
        if (selectedOrder?.id === order.id) setSelectedOrder(null);
      } else {
        toast.info('Status pembayaran belum berubah.', {
          description: `Status Midtrans: ${result.transaction_status || 'pending'}`,
        });
      }
    } catch (err) {
      toast.error('Gagal memeriksa status pembayaran.');
      console.error(err);
    } finally {
      setIsSyncingOrder(null);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Please Login</h1>
        <p className="text-muted-foreground mb-8">
          You need to login to view your orders.
        </p>
        <Button asChild>
          <Link href="/login?redirect=/orders">Login</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Success Toast */}
      <AnimatePresence>
        {showSuccessToast && (
          <motion.div
            initial={{ opacity: 0, y: -50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -50 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50"
          >
            <Card className="bg-green-50 border-green-200 dark:bg-green-900/50 dark:border-green-800">
              <CardContent className="flex items-center gap-3 py-4">
                <CheckCircle className="h-5 w-5 text-green-600 dark:text-green-400" />
                <p className="text-green-800 dark:text-green-200 font-medium">
                  Order placed successfully!
                </p>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">My Orders</h1>
          <p className="text-muted-foreground">Track and manage your orders</p>
        </div>

        {/* Search + Status Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order number or product..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {STATUS_TABS.map((status) => (
              <Button
                key={status}
                variant={statusFilter === status ? 'default' : 'outline'}
                size="sm"
                onClick={() => setStatusFilter(status)}
              >
                {status === 'all'
                  ? 'All'
                  : STATUS_CONFIG[status as OrderStatus].label}
              </Button>
            ))}
          </div>
        </div>

        {/* Orders List */}
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <Card key={i}>
                <CardContent className="p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div className="space-y-2">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-24" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <div className="flex gap-4">
                    <Skeleton className="h-20 w-20 rounded-md" />
                    <div className="space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <Card>
            <CardContent className="py-20 text-center">
              <Package className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No orders found</h2>
              <p className="text-muted-foreground mb-6">
                {searchQuery || statusFilter !== 'all'
                  ? 'Try adjusting your filters'
                  : "You haven't placed any orders yet"}
              </p>
              <Button asChild>
                <Link href="/products">
                  <ShoppingBag className="h-4 w-4 mr-2" />
                  Start Shopping
                </Link>
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order, index) => {
              const statusConfig =
                STATUS_CONFIG[order.order_status] ?? STATUS_CONFIG.pending;

              return (
                <motion.div
                  key={order.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardContent className="p-6">
                      {/* Order Header */}
                      <div className="flex flex-col sm:flex-row justify-between gap-4 mb-4">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-semibold">
                              {order.order_number}
                            </h3>
                            <Badge className={statusConfig.color}>
                              <span className="mr-1">{statusConfig.icon}</span>
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            Placed on {formatDate(order.created_at)}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-lg">
                            {formatCurrency(toNum(order.total))}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {order.items.length} item
                            {order.items.length > 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>

                      <Separator className="my-4" />

                      {/* Items preview */}
                      <div className="flex flex-wrap gap-4 mb-4">
                        {order.items.slice(0, 3).map((item) => (
                          <div key={item.id} className="flex gap-3">
                            <div className="relative h-16 w-16 rounded-md overflow-hidden bg-muted flex-shrink-0">
                              <Image
                                src="/placeholder-product.jpg"
                                alt={item.product_name}
                                fill
                                className="object-cover"
                              />
                            </div>
                            <div>
                              <p className="font-medium text-sm line-clamp-1">
                                {item.product_name}
                              </p>
                              {(item.variant_type || item.variant_value) && (
                                <p className="text-xs text-muted-foreground">
                                  {item.variant_type}: {item.variant_value}
                                </p>
                              )}
                              <p className="text-sm text-muted-foreground">
                                Qty: {item.quantity}
                              </p>
                            </div>
                          </div>
                        ))}
                        {order.items.length > 3 && (
                          <div className="flex items-center">
                            <span className="text-sm text-muted-foreground">
                              +{order.items.length - 3} more
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Tracking Info */}
                      {order.tracking_number &&
                        order.order_status === 'shipped' && (
                          <div className="bg-muted/50 rounded-lg p-3 mb-4">
                            <div className="flex items-center gap-2 text-sm">
                              <Truck className="h-4 w-4 text-primary" />
                              <span className="font-medium">Tracking:</span>
                              <span className="text-muted-foreground">
                                {order.tracking_number}
                              </span>
                            </div>
                          </div>
                        )}

                      {/* Actions */}
                      <div className="flex justify-between items-center">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setSelectedOrder(order)}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </Button>

                        <div className="flex gap-2 flex-wrap">
                          {order.order_status === 'pending' &&
                            order.payment_status === 'unpaid' && (
                            <Button
                              size="sm"
                              onClick={() => handlePayOrder(order)}
                              disabled={isPayingOrder === order.id}
                              className="gap-1"
                            >
                              <CreditCard className="h-3 w-3" />
                              {isPayingOrder === order.id ? 'Memuat...' : 'Lanjutkan Pembayaran'}
                            </Button>
                          )}
                          {order.order_status === 'pending' && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleSyncPayment(order)}
                              disabled={isSyncingOrder === order.id}
                              className="gap-1"
                            >
                              <RefreshCw className={`h-3 w-3 ${isSyncingOrder === order.id ? 'animate-spin' : ''}`} />
                              {isSyncingOrder === order.id ? 'Mengecek...' : 'Cek Status'}
                            </Button>
                          )}
                          {order.order_status === 'pending' && (
                            <Button
                              variant="destructive"
                              size="sm"
                              disabled={isCancelling === order.id}
                              onClick={() => handleCancelOrder(order.id)}
                            >
                              {isCancelling === order.id
                                ? 'Cancelling...'
                                : 'Cancel Order'}
                            </Button>
                          )}
                          {order.order_status === 'delivered' && (
                            <Button variant="outline" size="sm" asChild>
                              <Link href="/products">Buy Again</Link>
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-2">
                  Page {currentPage} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Order Detail Dialog */}
        <Dialog
          open={!!selectedOrder}
          onOpenChange={() => setSelectedOrder(null)}
        >
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            {selectedOrder && (
              <>
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    {selectedOrder.order_number}
                    <Badge
                      className={
                        STATUS_CONFIG[selectedOrder.order_status]?.color
                      }
                    >
                      {STATUS_CONFIG[selectedOrder.order_status]?.label}
                    </Badge>
                  </DialogTitle>
                </DialogHeader>

                <div className="space-y-6 mt-4">
                  {/* Order Timeline */}
                  <div>
                    <h4 className="font-medium mb-3">Order Status</h4>
                    <div className="flex items-center justify-between overflow-x-auto pb-2">
                      {(
                        [
                          'pending',
                          'processing',
                          'shipped',
                          'delivered',
                        ] as const
                      ).map((status, idx) => {
                        const order = selectedOrder;
                        const progression = [
                          'pending',
                          'payment_confirmed',
                          'processing',
                          'shipped',
                          'delivered',
                        ];
                        const currentIdx = progression.indexOf(
                          order.order_status
                        );
                        const stepIdx = progression.indexOf(
                          status === 'pending' ? 'pending' : status
                        );
                        const isActive = currentIdx >= stepIdx;
                        const isCurrent = order.order_status === status;

                        return (
                          <div key={status} className="flex items-center">
                            <div
                              className={`flex flex-col items-center ${idx > 0 ? 'ml-2' : ''}`}
                            >
                              <div
                                className={`w-8 h-8 rounded-full flex items-center justify-center ${
                                  isActive
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted text-muted-foreground'
                                }`}
                              >
                                {STATUS_CONFIG[status].icon}
                              </div>
                              <span
                                className={`text-xs mt-1 text-center ${isCurrent ? 'font-medium' : 'text-muted-foreground'}`}
                              >
                                {STATUS_CONFIG[status].label}
                              </span>
                            </div>
                            {idx < 3 && (
                              <div
                                className={`w-12 h-0.5 mx-1 ${isActive ? 'bg-primary' : 'bg-muted'}`}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <Separator />

                  {/* Items */}
                  <div>
                    <h4 className="font-medium mb-3">Items</h4>
                    <div className="space-y-3">
                      {selectedOrder.items.map((item) => (
                        <div key={item.id} className="flex gap-4">
                          <div className="relative h-20 w-20 rounded-md overflow-hidden bg-muted flex-shrink-0">
                            <Image
                              src="/placeholder-product.jpg"
                              alt={item.product_name}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <div className="flex-1">
                            <p className="font-medium">{item.product_name}</p>
                            {(item.variant_type || item.variant_value) && (
                              <p className="text-sm text-muted-foreground">
                                {item.variant_type}: {item.variant_value}
                              </p>
                            )}
                            <p className="text-sm text-muted-foreground">
                              {formatCurrency(toNum(item.unit_price))} ×{' '}
                              {item.quantity}
                            </p>
                          </div>
                          <p className="font-medium">
                            {formatCurrency(toNum(item.subtotal))}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  {/* Shipping Address */}
                  <div>
                    <h4 className="font-medium mb-3">Shipping Address</h4>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <p className="font-medium text-foreground">
                        {selectedOrder.shipping_name}
                      </p>
                      <p>{selectedOrder.shipping_phone}</p>
                      <p>{selectedOrder.shipping_address_line1}</p>
                      {selectedOrder.shipping_address_line2 && (
                        <p>{selectedOrder.shipping_address_line2}</p>
                      )}
                      <p>
                        {selectedOrder.shipping_city},{' '}
                        {selectedOrder.shipping_province}{' '}
                        {selectedOrder.shipping_postal_code}
                      </p>
                    </div>
                  </div>

                  <Separator />

                  {/* Payment Summary */}
                  <div>
                    <h4 className="font-medium mb-3">Payment Summary</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Subtotal</span>
                        <span>
                          {formatCurrency(toNum(selectedOrder.subtotal))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Shipping</span>
                        <span>
                          {formatCurrency(toNum(selectedOrder.shipping_cost))}
                        </span>
                      </div>
                      {toNum(selectedOrder.discount_amount) > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount</span>
                          <span>
                            -{formatCurrency(toNum(selectedOrder.discount_amount))}
                          </span>
                        </div>
                      )}
                      {toNum(selectedOrder.tax_amount) > 0 && (
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">Tax</span>
                          <span>
                            {formatCurrency(toNum(selectedOrder.tax_amount))}
                          </span>
                        </div>
                      )}
                      <Separator />
                      <div className="flex justify-between font-medium text-base">
                        <span>Total</span>
                        <span>
                          {formatCurrency(toNum(selectedOrder.total))}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Tracking */}
                  {selectedOrder.tracking_number && (
                    <div className="bg-muted/50 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Truck className="h-4 w-4 text-primary" />
                        <span className="font-medium">Tracking Number:</span>
                        <span className="text-muted-foreground">
                          {selectedOrder.tracking_number}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Dialog Actions */}
                  <div className="flex gap-2 pt-2 flex-wrap">
                    {selectedOrder.order_status === 'pending' &&
                      selectedOrder.payment_status === 'unpaid' && (
                      <Button
                        className="flex-1 gap-1"
                        onClick={() => handlePayOrder(selectedOrder)}
                        disabled={isPayingOrder === selectedOrder.id}
                      >
                        <CreditCard className="h-4 w-4" />
                        {isPayingOrder === selectedOrder.id ? 'Memuat...' : 'Lanjutkan Pembayaran'}
                      </Button>
                    )}
                    {selectedOrder.order_status === 'pending' && (
                      <Button
                        variant="outline"
                        className="gap-1"
                        onClick={() => handleSyncPayment(selectedOrder)}
                        disabled={isSyncingOrder === selectedOrder.id}
                      >
                        <RefreshCw className={`h-4 w-4 ${isSyncingOrder === selectedOrder.id ? 'animate-spin' : ''}`} />
                        {isSyncingOrder === selectedOrder.id ? 'Mengecek...' : 'Cek Status Pembayaran'}
                      </Button>
                    )}
                    {selectedOrder.order_status === 'pending' && (
                      <Button
                        variant="destructive"
                        className="flex-1"
                        disabled={isCancelling === selectedOrder.id}
                        onClick={() => handleCancelOrder(selectedOrder.id)}
                      >
                        {isCancelling === selectedOrder.id
                          ? 'Cancelling...'
                          : 'Cancel Order'}
                      </Button>
                    )}
                    <Button
                      variant="outline"
                      onClick={() => setSelectedOrder(null)}
                    >
                      Close
                    </Button>
                  </div>
                </div>
              </>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

export default function OrdersPage() {
  return (
    <Suspense
      fallback={
        <div className="container mx-auto px-4 py-8">Loading orders...</div>
      }
    >
      <OrdersPageContent />
    </Suspense>
  );
}
