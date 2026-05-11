'use client';

import { motion } from 'framer-motion';
import { Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CustomerMetrics } from '@/services/admin';

const motionProps = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: 'easeOut' as const },
});

interface CustomerInsightsProps {
  customers: CustomerMetrics;
}

export function CustomerInsights({ customers }: CustomerInsightsProps) {
  return (
    <motion.div {...motionProps(0.42)}>
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
    </motion.div>
  );
}
