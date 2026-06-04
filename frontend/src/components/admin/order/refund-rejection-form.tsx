'use client';

import type { AdminOrder } from '@/services/admin';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { useOrderRefundRejectionForm } from '@/hooks/useOrderRefundRejectionForm';
import { ADMIN_REFUND_REJECTION_REASON_OPTIONS } from '@/constants/refund.constants';

interface RefundRejectionFormProps {
  order: AdminOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefundRejected?: () => void;
}

export function RefundRejectionForm({
  order,
  open,
  onOpenChange,
  onRefundRejected,
}: RefundRejectionFormProps) {
  const {
    reason,
    notes,
    isLoading,
    error,
    setReason,
    setNotes,
    handleSubmit,
  } = useOrderRefundRejectionForm({ order, onOpenChange, onRefundRejected });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject Refund Request</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
            Reject hanya digunakan jika alasan, detail, atau bukti gambar tidak sesuai dengan kebijakan refund.
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Rejection Reason
            </label>
            <select
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="w-full rounded-lg border px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              <option value="">Select a reason...</option>
              {ADMIN_REFUND_REJECTION_REASON_OPTIONS.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-2 block text-sm font-medium text-gray-700">
              Notes for Review
            </label>
            <Textarea
              placeholder="Explain why this refund request is rejected..."
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={4}
            />
          </div>

          {error && (
            <div className="rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleSubmit()}
              disabled={isLoading || !reason}
            >
              {isLoading ? 'Rejecting...' : 'Reject Refund'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
