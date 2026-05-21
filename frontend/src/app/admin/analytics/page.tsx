'use client';

import { DollarSign, ShoppingCart, Users, TrendingUp } from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { MetricCard } from '@/components/admin/analytics/MetricCard';
import { SkeletonCard } from '@/components/admin/analytics/SkeletonCard';
import { OrderStatusChart } from '@/components/admin/analytics/OrderStatusChart';
import { CustomerInsights } from '@/components/admin/analytics/CustomerInsights';
import { PaymentMethodsChart } from '@/components/admin/analytics/PaymentMethodsChart';
import { ProductPerformanceTable } from '@/components/admin/analytics/ProductPerformanceTable';
import { AnalyticsHeader } from '@/components/admin/analytics/AnalyticsHeader';
import { RevenueChart } from '@/components/admin/charts/revenue-chart';
import { useAnalyticsData } from '@/hooks/useAnalyticsData';
import { formatCurrency } from '@/utils';

export default function AnalyticsPage() {
  const {
    revenue,
    orders,
    customers,
    products,
    dateRange,
    isLoading,
    isRefreshing,
    setDateRange,
    refresh,
  } = useAnalyticsData();

  const metricCards = revenue && orders && customers
    ? [
        {
          label: 'Total Pendapatan',
          value: formatCurrency(revenue.total_revenue),
          sub: `Rata-rata per order: ${formatCurrency(revenue.average_order_value)}`,
          icon: DollarSign,
          accent: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        },
        {
          label: 'Total Pesanan',
          value: orders.total_orders.toLocaleString('id-ID'),
          sub: `${orders.pending_orders} pending · ${orders.delivered_orders} terkirim`,
          icon: ShoppingCart,
          accent: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
        },
        {
          label: 'Total Pelanggan',
          value: customers.total_customers.toLocaleString('id-ID'),
          sub: `${customers.new_customers} pelanggan baru`,
          icon: Users,
          accent: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
        },
        {
          label: 'Nilai Order Tertinggi',
          value: formatCurrency(revenue.highest_order),
          sub: `Terendah: ${formatCurrency(revenue.lowest_order)}`,
          icon: TrendingUp,
          accent: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="space-y-8">
        <AnalyticsHeader
          dateRange={dateRange}
          onDateRangeChange={setDateRange}
          onRefresh={refresh}
          isRefreshing={isRefreshing}
        />

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : metricCards.map((card, i) => (
                <MetricCard key={card.label} {...card} delay={i * 0.06} />
              ))}
        </div>

        {/* Order Status Breakdown */}
        {!isLoading && orders && <OrderStatusChart orders={orders} />}

        {/* Revenue Chart */}
        <RevenueChart />

        {/* Customer Insights + Payment Methods */}
        {!isLoading && customers && orders && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <CustomerInsights customers={customers} />
            <PaymentMethodsChart orders={orders} />
          </div>
        )}

        {/* Top Products */}
        <ProductPerformanceTable products={products} isLoading={isLoading} />
      </div>
    </AdminLayout>
  );
}
