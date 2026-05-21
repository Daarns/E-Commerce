'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { AnimatePresence } from 'framer-motion';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { useAuthStore } from '@/stores/auth-store';
import { useOrdersList } from '@/hooks/useOrdersList';
import { useOrderActions } from '@/hooks/useOrderActions';
import { useMidtransPaymentModal } from '@/hooks/useMidtransPaymentModal';
import {
  OrderCard,
  OrderDetailModal,
  OrdersEmpty,
  OrdersSkeleton,
} from '@/components/orders';
import { SHOP_ORDER_STATUS_TABS } from '@/constants/order.constants';
import { Order } from '@/types';

function OrdersPageContent() {
  const { isAuthenticated, user } = useAuthStore();
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  React.useEffect(() => {
    const searchParams = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    if (searchParams.get('success') === 'true') {
      toast.success('Order placed successfully!');
    }
  }, []);

  const ordersList = useOrdersList(isAuthenticated);
  const orderActions = useOrderActions();
  const { pay: payWithMidtrans, snapLoadError } = useMidtransPaymentModal();

  const handlePayOrder = async (order: Order) => {
    if (!user?.email) return;
    const result = await orderActions.payOrder(order, user.email);
    if (result.snapToken) {
      const success = payWithMidtrans(result.snapToken, {
        onSuccess: () => {
          toast.success('Pembayaran berhasil!');
          setSelectedOrder(null);
          ordersList.setOrders([]);
          ordersList.setCurrentPage(1);
        },
        onPending: () => {
          toast.info('Menunggu konfirmasi pembayaran...');
          setSelectedOrder(null);
        },
        onError: () => toast.error('Pembayaran gagal. Silakan coba lagi.'),
        onClose: () => toast.info('Popup pembayaran ditutup. Anda masih bisa melanjutkan pembayaran dari halaman order.'),
      });
      if (!success && result.redirectUrl) {
        window.location.href = result.redirectUrl;
      } else if (!success) {
        toast.error(snapLoadError ?? 'Gagal membuka Midtrans Snap');
      }
    }
  };

  const handleSyncPayment = async (order: Order) => {
    const newOrders = await orderActions.syncPayment(order, ordersList.currentPage);
    if (newOrders.length > 0) {
      ordersList.setOrders(newOrders);
      setSelectedOrder(null);
    }
  };

  const handleCancelOrder = async (orderId: string) => {
    const updated = await orderActions.cancelOrder(orderId);
    if (updated) {
      ordersList.setOrders((prev) =>
        prev.map((o) => (o.id === updated.id ? updated : o))
      );
      if (selectedOrder?.id === orderId) setSelectedOrder(updated);
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

  const hasFilters: boolean = !!(ordersList.searchQuery || ordersList.statusFilter !== 'all');

  return (
    <div className="min-h-screen bg-background">
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
              value={ordersList.searchQuery}
              onChange={(e) => ordersList.setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          <div className="flex gap-2 flex-wrap">
            {SHOP_ORDER_STATUS_TABS.map((status) => (
              <Button
                key={status.value}
                variant={
                  ordersList.statusFilter === status.value ? 'default' : 'outline'
                }
                size="sm"
                onClick={() =>
                  ordersList.setStatusFilter(
                    status.value as typeof ordersList.statusFilter
                  )
                }
              >
                {status.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Orders Content */}
        {ordersList.isLoading ? (
          <OrdersSkeleton />
        ) : ordersList.filteredOrders.length === 0 ? (
          <OrdersEmpty hasFilters={hasFilters} />
        ) : (
          <div className="space-y-4">
            <AnimatePresence>
              {ordersList.filteredOrders.map((order, idx) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  index={idx}
                  isPayingOrder={orderActions.isPayingOrder === order.id}
                  isSyncingOrder={orderActions.isSyncingOrder === order.id}
                  isCancelling={orderActions.isCancelling === order.id}
                  onViewDetails={setSelectedOrder}
                  onPay={handlePayOrder}
                  onSync={handleSyncPayment}
                  onCancel={handleCancelOrder}
                />
              ))}
            </AnimatePresence>

            {/* Pagination */}
            {ordersList.totalPages > 1 && (
              <div className="flex justify-center gap-2 pt-4">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ordersList.currentPage === 1}
                  onClick={() =>
                    ordersList.setCurrentPage((p) => p - 1)
                  }
                >
                  Previous
                </Button>
                <span className="flex items-center text-sm text-muted-foreground px-2">
                  Page {ordersList.currentPage} of {ordersList.totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={ordersList.currentPage === ordersList.totalPages}
                  onClick={() =>
                    ordersList.setCurrentPage((p) => p + 1)
                  }
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        {/* Order Detail Modal */}
        <OrderDetailModal
          order={selectedOrder}
          isOpen={!!selectedOrder}
          isPayingOrder={orderActions.isPayingOrder === selectedOrder?.id}
          isSyncingOrder={orderActions.isSyncingOrder === selectedOrder?.id}
          isCancelling={orderActions.isCancelling === selectedOrder?.id}
          onClose={() => setSelectedOrder(null)}
          onPay={handlePayOrder}
          onSync={handleSyncPayment}
          onCancel={handleCancelOrder}
        />
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
