'use client';

import { motion } from 'framer-motion';
import { Package } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { SkeletonTable } from './SkeletonTable';
import { ProductPerformance } from '@/services/admin';
import { formatCurrency } from '@/utils';

const motionProps = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: 'easeOut' as const },
});

interface ProductPerformanceTableProps {
  products: ProductPerformance[];
  isLoading: boolean;
}

export function ProductPerformanceTable({ products, isLoading }: ProductPerformanceTableProps) {
  return (
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
  );
}
