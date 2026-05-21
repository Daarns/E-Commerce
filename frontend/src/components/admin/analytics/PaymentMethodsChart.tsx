'use client';

import { motion } from 'framer-motion';
import { BarChart3 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { OrderMetrics } from '@/services/admin';

const motionProps = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: 'easeOut' as const },
});

interface PaymentMethodsChartProps {
  orders: OrderMetrics;
}

export function PaymentMethodsChart({ orders }: PaymentMethodsChartProps) {
  const colors = [
    'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
    'bg-orange-500', 'bg-rose-500',
  ];

  return (
    <motion.div {...motionProps(0.42)}>
      <Card className="border-border/60">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Metode Pembayaran</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {orders.payment_methods && Object.keys(orders.payment_methods).length > 0 ? (
            <div className="space-y-3">
              {Object.entries(orders.payment_methods)
                .sort(([, a], [, b]) => b - a)
                .map(([method, count], idx) => {
                  const total = Object.values(orders.payment_methods).reduce((s, v) => s + v, 0);
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={method} className="space-y-1">
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium capitalize">{method.replace(/_/g, ' ')}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {count.toLocaleString('id-ID')} ({pct.toFixed(1)}%)
                        </span>
                      </div>
                      <div className="w-full h-1.5 rounded-full bg-muted overflow-hidden">
                        <div
                          className={`h-full rounded-full ${colors[idx % colors.length]} transition-all duration-700`}
                          style={{ width: `${Math.max(pct, 0.5)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-6">
              Belum ada data metode pembayaran
            </p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}
