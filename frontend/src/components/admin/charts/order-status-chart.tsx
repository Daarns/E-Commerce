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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { ADMIN_ORDER_STATUS_CHART_CONFIG } from '@/constants/order.constants';

interface OrderStatusChartProps {
  orders: OrderMetrics;
}

interface ChartTooltipPayload {
  name?: string;
  value?: number | string;
}

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayload[];
}

function CustomTooltip({ active, payload }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;
  const firstPayload = payload[0];
  if (!firstPayload) return null;

  const { name, value } = firstPayload;
  return (
    <div className="rounded-lg border border-border bg-background/95 backdrop-blur-sm shadow-lg p-3 text-sm">
      <p className="font-medium">{name}</p>
      <p className="text-muted-foreground">{Number(value).toLocaleString('id-ID')} pesanan</p>
    </div>
  );
}

export function OrderStatusChart({ orders }: OrderStatusChartProps) {
  const data = ADMIN_ORDER_STATUS_CHART_CONFIG
    .map(({ key, label, color }) => ({
      name: label,
      value: Number(orders[key as keyof OrderMetrics] ?? 0),
      color,
    }))
    .filter((item) => item.value > 0);

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Distribusi Status Pesanan</CardTitle>
        <CardDescription>Breakdown status semua pesanan</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="46%"
                innerRadius={58}
                outerRadius={90}
                paddingAngle={3}
                dataKey="value"
                strokeWidth={0}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip content={<CustomTooltip />} />
              <Legend
                iconType="circle"
                iconSize={8}
                wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
                formatter={(value) => (
                  <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>
                )}
              />
            </PieChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-64 text-muted-foreground gap-2">
            <span className="text-4xl">🛒</span>
            <p className="text-sm">Belum ada data pesanan</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
