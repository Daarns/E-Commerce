'use client';

import { useState } from 'react';
import { OrderStatus } from '@/types';
import { adminService } from '@/services/admin';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';

interface StatusUpdateDialogProps {
  orderId: string;
  currentStatus: OrderStatus;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
}

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['payment_confirmed', 'cancelled'],
  payment_confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

export function StatusUpdateDialog({
  orderId,
  currentStatus,
  open,
  onOpenChange,
  onStatusUpdated,
}: StatusUpdateDialogProps) {
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validTransitions = VALID_TRANSITIONS[currentStatus] || [];
  const canUpdate = validTransitions.length > 0;

  const handleSubmit = async () => {
    if (!newStatus) {
      setError('Please select a new status');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await adminService.updateOrderStatus(orderId, {
        status: newStatus as OrderStatus,
        notes: notes || undefined,
      });
      onStatusUpdated?.();
      onOpenChange(false);
      setNewStatus('');
      setNotes('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update status');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Update Order Status</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current Status
            </label>
            <div className="p-3 bg-gray-50 rounded border">
              <p className="font-medium capitalize">{currentStatus}</p>
            </div>
          </div>

          {canUpdate ? (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  New Status
                </label>
                <select
                  value={newStatus}
                  onChange={(e) => setNewStatus(e.target.value as OrderStatus | '')}
                  className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Select new status...</option>
                  {validTransitions.map((status) => (
                    <option key={status} value={status}>
                      {status.charAt(0).toUpperCase() + status.slice(1)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Notes (Optional)
                </label>
                <Textarea
                  placeholder="Add notes about this status update..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  rows={3}
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
                  onClick={handleSubmit}
                  disabled={isLoading || !newStatus}
                >
                  {isLoading ? 'Updating...' : 'Update Status'}
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
