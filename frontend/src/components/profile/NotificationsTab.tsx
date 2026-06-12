'use client';

import { motion } from 'framer-motion';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Notification } from '@/types';
import { formatDateTime } from '@/utils/format';

interface NotificationsTabProps {
  history: Notification[];
  isHistoryLoading: boolean;
  historyPage: number;
  historyTotalPages: number;
  historyTotal: number;
  canGoPrevious: boolean;
  canGoNext: boolean;
  onHistoryPageChange: (page: number) => void;
  onOpenNotification: (notification: Notification) => void;
}

export function NotificationsTab({
  history,
  isHistoryLoading,
  historyPage,
  historyTotalPages,
  historyTotal,
  canGoPrevious,
  canGoNext,
  onHistoryPageChange,
  onOpenNotification,
}: NotificationsTabProps) {
  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.3 }}
      >
        <Card>
          <CardHeader>
            <CardTitle>Notification History</CardTitle>
            <CardDescription>
              Showing up to 100 recent notifications with pagination.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isHistoryLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, index) => (
                  <div key={index} className="space-y-2 rounded-md border p-3">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                ))}
              </div>
            ) : history.length > 0 ? (
              <div className="space-y-3">
                {history.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => onOpenNotification(notification)}
                    className="w-full rounded-md border p-3 text-left transition-colors hover:bg-muted/70"
                  >
                    <div className="flex items-start gap-3">
                      <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${notification.read_at ? 'bg-muted' : 'bg-blue-600'}`} />
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-1 text-sm font-medium">{notification.title}</p>
                        <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">
                          {notification.message}
                        </p>
                        <p className="mt-2 text-xs text-muted-foreground">
                          {formatDateTime(notification.created_at)}
                        </p>
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            ) : (
              <div className="rounded-md border border-dashed py-10 text-center text-sm text-muted-foreground">
                Belum ada riwayat notifikasi.
              </div>
            )}

            <div className="mt-4 flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-muted-foreground">
                {historyTotal > 0
                  ? `Showing page ${historyPage} of ${historyTotalPages || 1} (${historyTotal} max shown)`
                  : 'No notifications'}
              </p>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canGoPrevious || isHistoryLoading}
                  onClick={() => onHistoryPageChange(historyPage - 1)}
                >
                  Previous
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={!canGoNext || isHistoryLoading}
                  onClick={() => onHistoryPageChange(historyPage + 1)}
                >
                  Next
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

      </motion.div>
    </>
  );
}
