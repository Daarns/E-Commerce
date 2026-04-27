'use client';

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { adminService, RevenueTrend } from '@/services/admin';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { formatCurrency } from '@/lib/utils';

// Custom tooltip for IDR currency
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-background/95 backdrop-blur-sm shadow-lg p-3 text-sm">
      <p className="font-semibold mb-2 text-foreground">{label}</p>
      {payload.map((entry: any) => (
        <div key={entry.name} className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">
            {entry.name === 'Revenue'
              ? formatCurrency(entry.value)
              : `${Number(entry.value).toLocaleString('id-ID')} pesanan`}
          </span>
        </div>
      ))}
    </div>
  );
}

export function RevenueChart() {
  const [data, setData] = useState<RevenueTrend[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setIsLoading(true);
        const trends = await adminService.getRevenueTrends(12);
        setData(trends);
      } catch (error) {
        console.error('Failed to fetch revenue trends:', error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  // Format month label: "2025-01" → "Jan '25"
  const formatMonthLabel = (month: string) => {
    if (!month) return '';
    const [year, m] = month.split('-');
    const date = new Date(Number(year), Number(m) - 1, 1);
    return date.toLocaleDateString('id-ID', { month: 'short', year: '2-digit' });
  };

  const formatYAxis = (value: number) => {
    if (value >= 1_000_000_000) return `${(value / 1_000_000_000).toFixed(1)}M`;
    if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(0)}jt`;
    if (value >= 1_000) return `${(value / 1_000).toFixed(0)}rb`;
    return value.toString();
  };

  return (
    <Card className="h-full">
      <CardHeader>
        <CardTitle className="text-base">Tren Pendapatan</CardTitle>
        <CardDescription>Pendapatan dan jumlah pesanan 12 bulan terakhir</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center justify-center h-72">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : data.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <ComposedChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-border/50" />
              <XAxis
                dataKey="month"
                tickFormatter={formatMonthLabel}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                yAxisId="revenue"
                orientation="left"
                tickFormatter={formatYAxis}
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={55}
              />
              <YAxis
                yAxisId="orders"
                orientation="right"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                axisLine={false}
                tickLine={false}
                width={35}
              />
              <Tooltip content={<CustomTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: '12px', paddingTop: '16px' }}
                formatter={(value) => <span style={{ color: 'hsl(var(--foreground))' }}>{value}</span>}
              />
              <Bar
                yAxisId="revenue"
                dataKey="revenue"
                name="Revenue"
                fill="hsl(var(--primary))"
                opacity={0.85}
                radius={[4, 4, 0, 0]}
                maxBarSize={40}
              />
              <Line
                yAxisId="orders"
                type="monotone"
                dataKey="orders"
                name="Pesanan"
                stroke="hsl(var(--chart-2, 220 70% 60%))"
                strokeWidth={2}
                dot={{ r: 3, fill: 'hsl(var(--chart-2, 220 70% 60%))' }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex flex-col items-center justify-center h-72 text-muted-foreground gap-2">
            <span className="text-4xl">📊</span>
            <p className="text-sm">Belum ada data pendapatan</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
