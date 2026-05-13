'use client';

import { AdminOrderMetrics } from '@/services/admin';
import { MetricCard } from '../analytics/MetricCard';
import { TrendingUp, Package, CheckCircle, DollarSign } from 'lucide-react';

interface OrderMetricsProps {
  metrics: AdminOrderMetrics | null;
}

export function OrderMetrics({ metrics }: OrderMetricsProps) {
  if (!metrics) return null;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      <MetricCard
        label="Total Orders"
        value={metrics.total_orders.toString()}
        icon={Package}
        accent="bg-blue-100 text-blue-600"
        delay={0}
      />

      <MetricCard
        label="Pending Orders"
        value={metrics.pending_orders.toString()}
        icon={TrendingUp}
        accent="bg-yellow-100 text-yellow-600"
        delay={0.1}
      />

      <MetricCard
        label="Delivered Orders"
        value={metrics.delivered_orders.toString()}
        icon={CheckCircle}
        accent="bg-green-100 text-green-600"
        delay={0.2}
      />

      <MetricCard
        label="Total Revenue"
        value={`Rp ${(metrics.total_revenue / 1000).toFixed(1)}K`}
        icon={DollarSign}
        accent="bg-emerald-100 text-emerald-600"
        delay={0.3}
      />
    </div>
  );
}
