'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  DollarSign,
  ShoppingCart,
  Users,
  TrendingUp,
  Loader2,
} from 'lucide-react';
import { adminService, DashboardSummary } from '@/services/admin';
import { toast } from 'sonner';
import { AdminLayout } from '@/components/admin/layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { RevenueChart } from '@/components/admin/charts/revenue-chart';
import { OrderStatusChart } from '@/components/admin/charts/order-status-chart';
import { TopProductsTable } from '@/components/admin/tables/top-products-table';

export default function AdminDashboardPage() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchDashboard = async () => {
      try {
        setIsLoading(true);
        const response = await adminService.getDashboardSummary();
        setSummary(response.data);
      } catch (error) {
        console.error('Failed to fetch dashboard:', error);
        toast.error('Failed to load dashboard data');
      } finally {
        setIsLoading(false);
      }
    };

    fetchDashboard();
  }, []);

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </AdminLayout>
    );
  }

  if (!summary) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <p className="text-muted-foreground">Failed to load dashboard data</p>
        </div>
      </AdminLayout>
    );
  }

  const metrics = [
    {
      label: 'Total Revenue',
      value: `$${(summary.revenue.total_revenue / 100).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: DollarSign,
      color: 'bg-blue-500/10 text-blue-500',
    },
    {
      label: 'Total Orders',
      value: summary.orders.total_orders.toString(),
      icon: ShoppingCart,
      color: 'bg-green-500/10 text-green-500',
    },
    {
      label: 'Total Customers',
      value: summary.customers.total_customers.toString(),
      icon: Users,
      color: 'bg-purple-500/10 text-purple-500',
    },
    {
      label: 'Avg Order Value',
      value: `$${(summary.revenue.average_order_value / 100).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      })}`,
      icon: TrendingUp,
      color: 'bg-orange-500/10 text-orange-500',
    },
  ];

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <AdminLayout>
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground mt-2">
            Welcome to your admin dashboard. Here's your business overview.
          </p>
        </div>

        {/* Metrics Grid */}
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6"
        >
          {metrics.map((metric, index) => {
            const Icon = metric.icon;
            return (
              <motion.div key={index} variants={itemVariants}>
                <Card className="hover:shadow-lg transition-shadow">
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">
                      {metric.label}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${metric.color}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{metric.value}</div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>

        {/* Charts and Tables */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Revenue Chart */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
            className="lg:col-span-2"
          >
            <RevenueChart />
          </motion.div>

          {/* Order Status Chart */}
          <motion.div
            variants={itemVariants}
            initial="hidden"
            animate="visible"
          >
            <OrderStatusChart orders={summary.orders} />
          </motion.div>
        </div>

        {/* Top Products */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
        >
          <TopProductsTable products={summary.orders.top_products} />
        </motion.div>

        {/* Order Status Summary */}
        <motion.div
          variants={itemVariants}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4"
        >
          {[
            { label: 'Pending', value: summary.orders.pending_orders, color: 'bg-yellow-500' },
            { label: 'Processing', value: summary.orders.processing_orders, color: 'bg-blue-500' },
            { label: 'Shipped', value: summary.orders.shipped_orders, color: 'bg-purple-500' },
            { label: 'Delivered', value: summary.orders.delivered_orders, color: 'bg-green-500' },
            { label: 'Cancelled', value: summary.orders.cancelled_orders, color: 'bg-red-500' },
          ].map((status) => (
            <Card key={status.label}>
              <CardHeader className="pb-2">
                <CardTitle className="text-xs font-medium text-muted-foreground">
                  {status.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex items-center gap-2">
                  <div className={`h-2 w-2 rounded-full ${status.color}`} />
                  <div className="text-xl font-bold">{status.value}</div>
                </div>
              </CardContent>
            </Card>
          ))}
        </motion.div>
      </div>
    </AdminLayout>
  );
}
