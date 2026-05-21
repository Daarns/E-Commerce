'use client';

import { CheckCircle, Clock } from 'lucide-react';
import { formatDate } from '@/utils';
import { AdminOrder } from '@/services/admin';

interface RecentOrdersListProps {
  orders: AdminOrder[];
  isLoading?: boolean;
}

export function RecentOrdersList({ orders, isLoading }: RecentOrdersListProps) {
  // DEBUG: Check what data we actually received
  if (orders.length > 0) {
    console.log('[RecentOrdersList] Orders data:', JSON.stringify(orders[0], null, 2));
    console.log('[RecentOrdersList] First order total:', orders[0].total);
    console.log('[RecentOrdersList] First order total_amount:', orders[0].total_amount);
  }
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="h-12 rounded bg-muted animate-pulse" />
        ))}
      </div>
    );
  }

  if (!orders || orders.length === 0) {
    return (
      <p className="text-sm text-muted-foreground text-center py-10">
        Belum ada pesanan
      </p>
    );
  }

  return (
    <div className="space-y-1">
      {orders.map((order) => (
        <div
          key={order.id}
          className="flex items-center justify-between py-2.5 border-b border-border/50 last:border-0"
        >
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">{order.order_number}</p>
            <p className="text-xs text-muted-foreground">{formatDate(order.created_at)}</p>
          </div>
          <div className="text-right shrink-0 ml-3">
            <p className="text-sm font-semibold">
              Rp {Number(order.total_amount || order.total || 100).toLocaleString('id-ID')}
            </p>
            <span
              className={`inline-flex items-center gap-1 text-xs font-medium ${order.payment_status === 'paid'
                  ? 'text-emerald-600'
                  : order.order_status === 'cancelled'
                    ? 'text-rose-500'
                    : 'text-yellow-600'
                }`}
            >
              {order.payment_status === 'paid' ? (
                <>
                  <CheckCircle className="h-3 w-3" /> Lunas
                </>
              ) : (
                <>
                  <Clock className="h-3 w-3" /> Pending
                </>
              )}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
