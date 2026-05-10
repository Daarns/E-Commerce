'use client';

import { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  ShoppingCart,
  Users,
  Package,
  RefreshCw,
  Calendar,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { AdminLayout } from '@/components/admin/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  adminService,
  RevenueMetrics,
  OrderMetrics,
  CustomerMetrics,
  RevenueTrend,
  ProductPerformance,
} from '@/services/admin';
import { RevenueChart } from '@/components/admin/charts/revenue-chart';
import { formatCurrency } from '@/utils';
import { toast } from 'sonner';

function motionProps(delay = 0) {
  return {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.38, delay, ease: 'easeOut' as const },
  };
}

function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  trend,
  delay,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  trend?: { value: number; positive: boolean };
  delay?: number;
}) {
  return (
    <motion.div {...motionProps(delay)}>
      <Card className="overflow-hidden border-border/60 hover:shadow-md hover:border-primary/20 transition-all duration-300 group">
        <CardContent className="p-6">
          <div className="flex items-start justify-between">
            <div className="space-y-1 flex-1 min-w-0">
              <p className="text-sm font-medium text-muted-foreground truncate">{label}</p>
              <p className="text-2xl font-bold tracking-tight">{value}</p>
              {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
              {trend && (
                <div className={`flex items-center gap-1 text-xs font-medium ${trend.positive ? 'text-emerald-500' : 'text-rose-500'}`}>
                  {trend.positive ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                  {Math.abs(trend.value).toFixed(1)}% dari bulan lalu
                </div>
              )}
            </div>
            <div className={`p-3 rounded-xl shrink-0 ${accent} group-hover:scale-110 transition-transform duration-200`}>
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}

function SkeletonCard() {
  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="h-4 w-28 rounded bg-muted animate-pulse" />
            <div className="h-7 w-36 rounded bg-muted animate-pulse" />
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-11 w-11 rounded-xl bg-muted animate-pulse shrink-0" />
        </div>
      </CardContent>
    </Card>
  );
}

function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex items-center gap-4">
          <div className="h-8 w-8 rounded-full bg-muted animate-pulse shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-4 w-48 rounded bg-muted animate-pulse" />
            <div className="h-3 w-24 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-4 w-20 rounded bg-muted animate-pulse" />
        </div>
      ))}
    </div>
  );
}

export default function AnalyticsPage() {
  const [revenue, setRevenue] = useState<RevenueMetrics | null>(null);
  const [orders, setOrders] = useState<OrderMetrics | null>(null);
  const [customers, setCustomers] = useState<CustomerMetrics | null>(null);
  const [products, setProducts] = useState<ProductPerformance[]>([]);
  const [trends, setTrends] = useState<RevenueTrend[]>([]);
  const [dateRange, setDateRange] = useState('30');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      else setIsRefreshing(true);

      const endDate = new Date().toISOString().split('T')[0];
      const startDate = new Date(Date.now() - parseInt(dateRange) * 86400000)
        .toISOString()
        .split('T')[0];

      const [revenueData, ordersData, customersData, productsData, trendsData] =
        await Promise.all([
          adminService.getRevenueMetrics(startDate, endDate).then((r) => r.data),
          adminService.getOrderAnalytics().then((r) => r.data),
          adminService.getCustomerAnalytics().then((r) => r.data),
          adminService.getProductPerformance(10).then((r) => r.data?.products ?? []),
          adminService.getRevenueTrends(12),
        ]);

      setRevenue(revenueData);
      setOrders(ordersData);
      setCustomers(customersData);
      setProducts(productsData);
      setTrends(trendsData);
    } catch (err) {
      toast.error('Gagal memuat data analytics');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [dateRange]);

  useEffect(() => { loadData(); }, [loadData]);

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

  const orderStatusItems = orders
    ? [
        { label: 'Pending', count: orders.pending_orders, color: 'bg-yellow-500', pct: orders.total_orders ? (orders.pending_orders / orders.total_orders * 100) : 0 },
        { label: 'Diproses', count: orders.processing_orders, color: 'bg-blue-500', pct: orders.total_orders ? (orders.processing_orders / orders.total_orders * 100) : 0 },
        { label: 'Dikirim', count: orders.shipped_orders, color: 'bg-purple-500', pct: orders.total_orders ? (orders.shipped_orders / orders.total_orders * 100) : 0 },
        { label: 'Terkirim', count: orders.delivered_orders, color: 'bg-emerald-500', pct: orders.total_orders ? (orders.delivered_orders / orders.total_orders * 100) : 0 },
        { label: 'Dibatalkan', count: orders.cancelled_orders, color: 'bg-rose-500', pct: orders.total_orders ? (orders.cancelled_orders / orders.total_orders * 100) : 0 },
      ]
    : [];

  return (
    <AdminLayout>
      <div className="space-y-8">

        {/* Header */}
        <motion.div {...motionProps(0)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
            <p className="text-muted-foreground mt-1 text-sm">
              Pantau performa bisnis secara mendalam.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Date range selector */}
            {['7', '30', '90'].map((d) => (
              <Button
                key={d}
                variant={dateRange === d ? 'default' : 'outline'}
                size="sm"
                onClick={() => setDateRange(d)}
                className="text-xs"
              >
                <Calendar className="h-3.5 w-3.5 mr-1" />
                {d} hari
              </Button>
            ))}
            <Button
              variant="outline"
              size="sm"
              onClick={() => loadData(true)}
              disabled={isRefreshing}
              className="gap-2"
            >
              <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </motion.div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
            : metricCards.map((card, i) => (
                <MetricCard key={card.label} {...card} delay={i * 0.06} />
              ))}
        </div>

        {/* Order Status Breakdown */}
        {!isLoading && orders && (
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
                  {orderStatusItems.map((item) => (
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
        )}

        {/* Revenue Chart */}
        <motion.div {...motionProps(0.35)}>
          <RevenueChart />
        </motion.div>

        {/* Customer Insights + Payment Methods */}
        {!isLoading && customers && orders && (
          <motion.div {...motionProps(0.42)}>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* Customer Segments */}
              <Card className="border-border/60">
                <CardHeader className="pb-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-primary" />
                    <CardTitle className="text-base">Insight Pelanggan</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-4 mb-6">
                    {[
                      { label: 'Total', value: customers.total_customers, color: 'text-foreground' },
                      { label: 'Aktif (30 hari)', value: customers.active_customers, color: 'text-emerald-500' },
                      { label: 'Baru', value: customers.new_customers, color: 'text-blue-500' },
                      { label: 'Kembali', value: customers.return_customers, color: 'text-violet-500' },
                    ].map((m) => (
                      <div key={m.label} className="rounded-lg bg-muted/50 p-3 text-center">
                        <p className={`text-2xl font-bold ${m.color}`}>
                          {Number(m.value).toLocaleString('id-ID')}
                        </p>
                        <p className="text-xs text-muted-foreground mt-0.5">{m.label}</p>
                      </div>
                    ))}
                  </div>
                  {customers.customer_segments && Object.keys(customers.customer_segments).length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-2">Segmen</p>
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(customers.customer_segments).map(([seg, count]) => (
                          <Badge key={seg} variant="secondary" className="capitalize gap-1">
                            {seg}: <span className="font-bold">{Number(count).toLocaleString('id-ID')}</span>
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Payment Methods */}
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
                          const colors = [
                            'bg-blue-500', 'bg-violet-500', 'bg-emerald-500',
                            'bg-orange-500', 'bg-rose-500',
                          ];
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
            </div>
          </motion.div>
        )}

        {/* Top Products */}
        <motion.div {...motionProps(0.5)}>
          <Card className="border-border/60">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <Package className="h-4 w-4 text-primary" />
                <CardTitle className="text-base">Performa Produk</CardTitle>
              </div>
              <CardDescription>10 produk dengan performa terbaik</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <SkeletonTable />
              ) : products.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">
                  Belum ada data performa produk
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">#</th>
                        <th className="text-left py-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Produk</th>
                        <th className="text-right py-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Terjual</th>
                        <th className="text-right py-3 pr-4 text-muted-foreground font-medium text-xs uppercase tracking-wide">Pendapatan</th>
                        <th className="text-right py-3 text-muted-foreground font-medium text-xs uppercase tracking-wide">Stok</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                      {products.map((p, i) => (
                        <tr key={p.product_id ?? i} className="hover:bg-muted/30 transition-colors group">
                          <td className="py-3 pr-4">
                            <span className="w-6 h-6 rounded-full bg-muted text-muted-foreground text-xs font-medium flex items-center justify-center">
                              {p.rank ?? i + 1}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <p className="font-medium truncate max-w-[200px]">{p.product_name}</p>
                            <p className="text-xs text-muted-foreground capitalize">{p.category_name || '—'}</p>
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums">
                            {(p.total_sales ?? 0).toLocaleString('id-ID')}
                          </td>
                          <td className="py-3 pr-4 text-right tabular-nums font-medium">
                            {formatCurrency(p.total_revenue ?? 0)}
                          </td>
                          <td className="py-3 text-right">
                            <Badge
                              variant={p.current_stock === 0 ? 'destructive' : p.current_stock < 10 ? 'outline' : 'secondary'}
                              className="tabular-nums text-xs"
                            >
                              {p.current_stock ?? 0}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AdminLayout>
  );
}
