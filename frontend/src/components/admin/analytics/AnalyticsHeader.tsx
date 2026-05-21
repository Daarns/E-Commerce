'use client';

import { motion } from 'framer-motion';
import { RefreshCw, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';

const motionProps = (delay = 0) => ({
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0 },
  transition: { duration: 0.38, delay, ease: 'easeOut' as const },
});

interface AnalyticsHeaderProps {
  dateRange: string;
  onDateRangeChange: (range: string) => void;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export function AnalyticsHeader({
  dateRange,
  onDateRangeChange,
  onRefresh,
  isRefreshing,
}: AnalyticsHeaderProps) {
  return (
    <motion.div {...motionProps(0)} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Pantau performa bisnis secara mendalam.
        </p>
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        {['7', '30', '90'].map((d) => (
          <Button
            key={d}
            variant={dateRange === d ? 'default' : 'outline'}
            size="sm"
            onClick={() => onDateRangeChange(d)}
            className="text-xs"
          >
            <Calendar className="h-3.5 w-3.5 mr-1" />
            {d} hari
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>
    </motion.div>
  );
}
