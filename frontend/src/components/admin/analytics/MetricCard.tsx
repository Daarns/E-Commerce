'use client';

import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const motionProps = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: 'easeOut' as const },
});

interface MetricCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: React.ElementType;
  accent: string;
  trend?: { value: number; positive: boolean };
  delay?: number;
}

export function MetricCard({
  label,
  value,
  sub,
  icon: Icon,
  accent,
  trend,
  delay,
}: MetricCardProps) {
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
                <div
                  className={`flex items-center gap-1 text-xs font-medium ${
                    trend.positive ? 'text-emerald-500' : 'text-rose-500'
                  }`}
                >
                  {trend.positive ? (
                    <ArrowUpRight className="h-3 w-3" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3" />
                  )}
                  {Math.abs(trend.value).toFixed(1)}% dari bulan lalu
                </div>
              )}
            </div>
            <div
              className={`p-3 rounded-xl shrink-0 ${accent} group-hover:scale-110 transition-transform duration-200`}
            >
              <Icon className="h-5 w-5" />
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
