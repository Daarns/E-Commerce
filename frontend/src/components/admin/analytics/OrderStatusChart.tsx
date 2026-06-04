'use client';

import { motion } from 'framer-motion';
import { ShoppingCart } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { OrderMetrics } from '@/services/admin';

const motionProps = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: 'easeOut' as const },
});

interface OrderStatusChartProps {
  orders: OrderMetrics;
}

export function OrderStatusChart({ orders }: OrderStatusChartProps) {
  const statusItems = [
    {
      label: 'Pending',
      count: orders.pending_orders,
      color: 'bg-yellow-500',
      pct: orders.total_orders ? (orders.pending_orders / orders.total_orders) * 100 : 0,
    },
    {
      label: 'Diproses',
      count: orders.processing_orders,
      color: 'bg-blue-500',
      pct: orders.total_orders ? (orders.processing_orders / orders.total_orders) * 100 : 0,
    },
    {
      label: 'Dikirim',
      count: orders.shipped_orders,
      color: 'bg-purple-500',
      pct: orders.total_orders ? (orders.shipped_orders / orders.total_orders) * 100 : 0,
    },
    {
      label: 'Terkirim',
      count: orders.delivered_orders,
      color: 'bg-emerald-500',
      pct: orders.total_orders ? (orders.delivered_orders / orders.total_orders) * 100 : 0,
    },
    {
      label: 'Selesai',
      count: orders.completed_orders,
      color: 'bg-teal-500',
      pct: orders.total_orders ? (orders.completed_orders / orders.total_orders) * 100 : 0,
    },
    {
      label: 'Refund Request',
      count: orders.refund_requested_orders,
      color: 'bg-orange-500',
      pct: orders.total_orders ? (orders.refund_requested_orders / orders.total_orders) * 100 : 0,
    },
    {
      label: 'Refunded',
      count: orders.refunded_orders,
      color: 'bg-slate-500',
      pct: orders.total_orders ? (orders.refunded_orders / orders.total_orders) * 100 : 0,
    },
    {
      label: 'Dibatalkan',
      count: orders.cancelled_orders,
      color: 'bg-rose-500',
      pct: orders.total_orders ? (orders.cancelled_orders / orders.total_orders) * 100 : 0,
    },
  ];

  return (
    <motion.div {...motionProps(0.28)}>
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <ShoppingCart className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Distribusi Status Pesanan</CardTitle>
          </div>
          <CardDescription>
            Total {orders.total_orders.toLocaleString('id-ID')} pesanan
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {statusItems.map((item) => (
              <div key={item.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <div className={`h-2 w-2 rounded-full ${item.color}`} />
                    <span className="font-medium">{item.label}</span>
                  </div>
                  <span className="text-muted-foreground tabular-nums">
                    {item.count.toLocaleString('id-ID')}{' '}
                    <span className="text-xs">({item.pct.toFixed(1)}%)</span>
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${item.color} transition-all duration-700`}
                    style={{ width: `${Math.max(item.pct, 0.5)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
