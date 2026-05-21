'use client';

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { formatCurrency } from '@/utils';
import { Trophy } from 'lucide-react';

// Matches backend TopProductMetric JSON fields
interface TopProduct {
  product_id: string;
  product_name: string;
  product_slug: string;
  sales_count: number;
  total_revenue: number;
  average_price: number;
  rank: number;
}

interface TopProductsTableProps {
  products: TopProduct[];
}

const rankColor = (rank: number) => {
  if (rank === 1) return 'text-yellow-500';
  if (rank === 2) return 'text-slate-400';
  if (rank === 3) return 'text-orange-400';
  return 'text-muted-foreground';
};

export function TopProductsTable({ products }: TopProductsTableProps) {
  return (
    <Card className="h-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Trophy className="h-4 w-4 text-yellow-500" />
          <CardTitle className="text-base">Produk Terlaris</CardTitle>
        </div>
        <CardDescription>Berdasarkan total pendapatan dari pesanan selesai</CardDescription>
      </CardHeader>
      <CardContent>
        {products && products.length > 0 ? (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="w-10">#</TableHead>
                  <TableHead>Nama Produk</TableHead>
                  <TableHead className="text-right">Terjual</TableHead>
                  <TableHead className="text-right">Harga Rata-rata</TableHead>
                  <TableHead className="text-right">Total Pendapatan</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product) => (
                  <TableRow key={product.product_id} className="hover:bg-muted/40">
                    <TableCell>
                      <span className={`font-bold text-sm ${rankColor(product.rank)}`}>
                        {product.rank <= 3 ? '●' : product.rank}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className="font-medium text-sm leading-tight">{product.product_name}</p>
                        <p className="text-xs text-muted-foreground">{product.product_slug}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <Badge variant="secondary" className="font-semibold">
                        {Number(product.sales_count).toLocaleString('id-ID')} pcs
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right text-sm text-muted-foreground">
                      {formatCurrency(product.average_price)}
                    </TableCell>
                    <TableCell className="text-right font-semibold text-sm">
                      {formatCurrency(product.total_revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-muted-foreground gap-2">
            <span className="text-4xl">📦</span>
            <p className="text-sm">Belum ada data penjualan produk</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
