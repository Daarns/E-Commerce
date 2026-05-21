'use client';

import type { AdminOrder } from '@/services/admin';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { REFUND_REASONS, useOrderRefundForm } from '@/hooks/useOrderRefundForm';

interface RefundFormProps {
  order: AdminOrder;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onRefundProcessed?: () => void;
}

export function RefundForm({
  order,
  open,
  onOpenChange,
  onRefundProcessed,
}: RefundFormProps) {
  const {
    orderTotal,
    amount,
    reason,
    notes,
    isLoading,
    error,
    setAmount,
    setReason,
    setNotes,
    handleSubmit,
  } = useOrderRefundForm({ order, onOpenChange, onRefundProcessed });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Process Refund</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Order Total
            </label>
            <div className="p-3 bg-gray-50 rounded border">
              <p className="font-semibold">
                Rp {orderTotal.toLocaleString('id-ID')}
              </p>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Refund Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-3 text-gray-600">Rp</span>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="pl-8"
                step="1000"
              />
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Amount to refund to customer
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Refund Reason
            </label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select a reason...</option>
              {REFUND_REASONS.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Internal Notes (Optional)
            </label>
            <Textarea
              placeholder="Add notes about this refund..."
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

          <div className="bg-blue-50 border border-blue-200 rounded p-3">
            <p className="text-sm text-blue-700">
              Customer will be notified and refund will be processed to their original payment method.
            </p>
          </div>

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
              disabled={isLoading || !reason}
              variant="destructive"
            >
              {isLoading ? 'Processing...' : 'Process Refund'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
