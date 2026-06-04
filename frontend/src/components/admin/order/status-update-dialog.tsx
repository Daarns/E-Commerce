'use client';

import type { OrderStatus } from '@/types';
import { ADMIN_ORDER_STATUS_LABELS } from '@/constants/order.constants';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useOrderStatusUpdate } from '@/hooks/useOrderStatusUpdate';
import { Wand2 } from 'lucide-react';

interface StatusUpdateDialogProps {
  orderId: string;
  currentStatus: OrderStatus;
  targetStatus: OrderStatus;
  actionLabel: string;
  requiresTracking?: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
}

export function StatusUpdateDialog({
  orderId,
  currentStatus,
  targetStatus,
  actionLabel,
  requiresTracking = false,
  open,
  onOpenChange,
  onStatusUpdated,
}: StatusUpdateDialogProps) {
  const {
    notes,
    trackingNumber,
    isLoading,
    error,
    canUpdate,
    setNotes,
    setTrackingNumber,
    generateDummyTrackingNumber,
    handleSubmit,
  } = useOrderStatusUpdate({
    orderId,
    currentStatus,
    targetStatus,
    requiresTracking,
    onOpenChange,
    onStatusUpdated,
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{actionLabel}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Status
            </label>
            <div className="p-3 bg-gray-50 rounded border">
              <p className="font-medium">{ADMIN_ORDER_STATUS_LABELS[currentStatus]}</p>
            </div>
          </div>

          {canUpdate ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <div className="p-3 bg-gray-50 rounded border">
                  <p className="font-medium">{ADMIN_ORDER_STATUS_LABELS[targetStatus]}</p>
                </div>
              </div>

              {requiresTracking && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Tracking Number
                  </label>
                  <div className="flex gap-2">
                    <Input
                      placeholder="Masukkan nomor resi"
                      value={trackingNumber}
                      onChange={(event) => setTrackingNumber(event.target.value)}
                      disabled={isLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="shrink-0 gap-2"
                      onClick={generateDummyTrackingNumber}
                      disabled={isLoading}
                    >
                      <Wand2 className="h-4 w-4" />
                      Dummy
                    </Button>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">
                    Dummy hanya untuk testing flow internal, bukan nomor resi ekspedisi valid.
                  </p>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add notes about this status update..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
                  disabled={isLoading}
                />
              </div>

              {error && (
                <div className="p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isLoading}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => void handleSubmit()}
                  disabled={isLoading || (requiresTracking && trackingNumber.trim().length === 0)}
                >
                  {isLoading ? 'Updating...' : actionLabel}
                </Button>
              </div>
            </>
          ) : (
            <div className="p-3 bg-gray-50 border rounded">
              <p className="text-sm text-gray-600">
                This order is in a final state and cannot be updated.
              </p>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
