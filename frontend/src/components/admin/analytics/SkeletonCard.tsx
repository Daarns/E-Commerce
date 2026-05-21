'use client';

import { Card, CardContent } from '@/components/ui/card';

export function SkeletonCard() {
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
