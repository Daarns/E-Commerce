'use client';

import {
  PieChart,
  Pie,
  Cell,
  Legend,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { OrderMetrics } from '@/services/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface OrderStatusChartProps {
  orders: OrderMetrics;
}

const COLORS = {
  pending: '#EAB308',
  processing: '#3B82F6',
  shipped: '#A855F7',
  delivered: '#22C55E',
  cancelled: '#EF4444',
};

export function OrderStatusChart({ orders }: OrderStatusChartProps) {
  const data = [
    { name: 'Pending', value: orders.pending_orders },
    { name: 'Processing', value: orders.processing_orders },
    { name: 'Shipped', value: orders.shipped_orders },
    { name: 'Delivered', value: orders.delivered_orders },
    { name: 'Cancelled', value: orders.cancelled_orders },
  ].filter(item => item.value > 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Order Status Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      COLORS[entry.name.toLowerCase() as keyof typeof COLORS] ||
                      '#8884d8'
                    }
                  />
                ))}
              </Pie>
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--background)',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                }}
              />
              <Legend />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex items-center justify-center h-64 text-muted-foreground">
            No order data
          </div>
        )}
      </CardContent>
    </Card>
  );
}
