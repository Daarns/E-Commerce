'use client';

import { motion } from 'framer-motion';
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Loader2,
  Package,
  AlertTriangle,
  RefreshCw,
  ArrowUpRight,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StatCard } from '@/components/admin/stat-card';
import { SkeletonCard } from '@/components/admin/skeleton-card';
import { RevenueChart } from '@/components/admin/charts/revenue-chart';
import { OrderStatusChart } from '@/components/admin/charts/order-status-chart';
import { TopProductsTable } from '@/components/admin/tables/top-products-table';
import { RecentOrdersList } from '@/components/admin/recent-orders-list';
import { useAdminDashboard } from '@/hooks/useAdminDashboard';
import { formatCurrency } from '@/utils';
import { motionProps } from '@/utils/motion';

export default function AdminDashboardPage() {
  const { summary, isLoading, isRefreshing, fetchDashboard } = useAdminDashboard();

  const stats = summary
    ? [
        {
          label: 'Total Pendapatan',
          value: formatCurrency(summary.revenue_metrics.total_revenue),
          sub: 'Periode 30 hari terakhir',
          icon: DollarSign,
          color: 'bg-blue-500/10 text-blue-500',
        },
        {
          label: 'Total Pesanan',
          value: Number(summary.order_analytics.total_orders).toLocaleString('id-ID'),
          sub: `${Number(summary.order_analytics.pending_orders)} pesanan pending`,
          icon: ShoppingCart,
          color: 'bg-violet-500/10 text-violet-500',
        },
        {
          label: 'Total Pelanggan',
          value: Number(summary.customer_analytics.total_customers).toLocaleString('id-ID'),
          sub: `${Number(summary.customer_analytics.new_customers)} baru bulan ini`,
          icon: Users,
          color: 'bg-emerald-500/10 text-emerald-500',
        },
        {
          label: 'Rata-rata Nilai Pesanan',
          value: formatCurrency(summary.revenue_metrics.average_order_value),
          sub: 'Per transaksi selesai',
          icon: TrendingUp,
          color: 'bg-orange-500/10 text-orange-500',
        },
      ]
    : [];

  const orderStatuses = summary
    ? [
        { label: 'Pending',     value: summary.order_analytics.pending_orders,    color: 'bg-yellow-500', text: 'text-yellow-600 dark:text-yellow-400' },
        { label: 'Diproses',    value: summary.order_analytics.processing_orders, color: 'bg-blue-500',   text: 'text-blue-600 dark:text-blue-400' },
        { label: 'Dikirim',     value: summary.order_analytics.shipped_orders,    color: 'bg-purple-500', text: 'text-purple-600 dark:text-purple-400' },
        { label: 'Terkirim',    value: summary.order_analytics.delivered_orders,  color: 'bg-emerald-500',text: 'text-emerald-600 dark:text-emerald-400' },
        { label: 'Dibatalkan',  value: summary.order_analytics.cancelled_orders,  color: 'bg-rose-500',   text: 'text-rose-600 dark:text-rose-400' },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* Header */}
        <motion.div {...motionProps(0)} className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Ringkasan performa bisnis Anda secara real-time.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboard(true)}
            disabled={isRefreshing}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </motion.div>

        {/* Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : stats.map((stat, i) => (
                <StatCard key={stat.label} {...stat} delay={i * 0.07} />
              ))}
        </div>

        {/* Low Stock Alert */}
        {!isLoading && summary && summary.low_stock_products && summary.low_stock_products.length > 0 && (
          <motion.div {...motionProps(0.28)}>
            <Card className="border-orange-500/40 bg-orange-500/5">
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                  <CardTitle className="text-base text-orange-700 dark:text-orange-400">
                    Stok Hampir Habis — {summary.low_stock_products.length} produk
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex flex-wrap gap-2">
                  {summary.low_stock_products.slice(0, 8).map((p) => (
                    <Badge key={p.id} variant="outline" className="border-orange-400 text-orange-700 dark:text-orange-300 gap-1">
                      <Package className="h-3 w-3" />
                      {p.name}
                      <span className="font-bold">({p.stock_quantity})</span>
                    </Badge>
                  ))}
                  {summary.low_stock_products.length > 8 && (
                    <Badge variant="outline" className="text-muted-foreground">
                      +{summary.low_stock_products.length - 8} lainnya
                    </Badge>
                  )}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Order Status Breakdown */}
        {!isLoading && summary && (
          <motion.div {...motionProps(0.35)}>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {orderStatuses.map((s) => (
                <Card key={s.label} className="hover:shadow-md transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-muted-foreground">{s.label}</span>
                      <div className={`h-2 w-2 rounded-full ${s.color}`} />
                    </div>
                    <p className={`text-2xl font-bold ${s.text}`}>
                      {Number(s.value).toLocaleString('id-ID')}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </motion.div>
        )}

        {/* Charts */}
        <motion.div {...motionProps(0.42)}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2">
              <RevenueChart />
            </div>
            <div>
              {isLoading ? (
                <Card>
                  <CardContent className="h-80 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              ) : summary ? (
                <OrderStatusChart orders={summary.order_analytics} />
              ) : null}
            </div>
          </div>
        </motion.div>

        {/* Top Products + Recent Orders */}
        <motion.div {...motionProps(0.49)}>
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
            <div className="xl:col-span-2">
              {isLoading ? (
                <Card>
                  <CardContent className="h-64 flex items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </CardContent>
                </Card>
              ) : summary ? (
                <TopProductsTable products={summary.order_analytics.top_products ?? []} />
              ) : null}
            </div>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Pesanan Terbaru</CardTitle>
                <CardDescription>5 pesanan terakhir yang masuk</CardDescription>
              </CardHeader>
              <CardContent className="space-y-1">
                <RecentOrdersList 
                  orders={summary?.recent_orders || []} 
                  isLoading={isLoading}
                />
              </CardContent>
            </Card>
          </div>
        </motion.div>

        {/* Customer Insights */}
        {!isLoading && summary && (
          <motion.div {...motionProps(0.56)}>
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  <CardTitle className="text-base">Insight Pelanggan</CardTitle>
                </div>
                <CardDescription>Distribusi dan nilai seumur hidup pelanggan</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 mb-6">
                  {[
                    { label: 'Total Pelanggan', value: summary.customer_analytics.total_customers, color: 'text-foreground' },
                    { label: 'Aktif (30 hari)',  value: summary.customer_analytics.active_customers,  color: 'text-emerald-500' },
                    { label: 'Pelanggan Baru',   value: summary.customer_analytics.new_customers,     color: 'text-blue-500' },
                    { label: 'Kembali Berbelanja', value: summary.customer_analytics.return_customers, color: 'text-violet-500' },
                  ].map((m) => (
                    <div key={m.label} className="text-center">
                      <p className={`text-3xl font-bold ${m.color}`}>
                        {Number(m.value).toLocaleString('id-ID')}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">{m.label}</p>
                    </div>
                  ))}
                </div>
                {summary.customer_analytics.customer_segments && Object.keys(summary.customer_analytics.customer_segments).length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Segmen Pelanggan</p>
                    <div className="flex gap-2 flex-wrap">
                      {Object.entries(summary.customer_analytics.customer_segments).map(([seg, count]) => (
                        <Badge key={seg} variant="secondary" className="capitalize gap-1">
                          {seg}: <span className="font-bold">{Number(count).toLocaleString('id-ID')}</span>
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        )}

      </div>
    </AdminLayout>
  );
}
