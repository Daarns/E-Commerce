import { useCallback, useState } from 'react';
import { adminService, type AdminOrder } from '@/services/admin';

export const REFUND_REASONS = [
  'Customer Request',
  'Product Defect',
  'Wrong Product Sent',
  'No Longer Needed',
  'Product Not as Described',
  'Late Delivery',
  'Other',
] as const;

interface UseOrderRefundFormParams {
  order: AdminOrder;
  onOpenChange: (open: boolean) => void;
  onRefundProcessed?: () => void;
}

interface UseOrderRefundFormReturn {
  orderTotal: number;
  amount: string;
  reason: string;
  notes: string;
  isLoading: boolean;
  error: string | null;
  setAmount: (amount: string) => void;
  setReason: (reason: string) => void;
  setNotes: (notes: string) => void;
  handleSubmit: () => Promise<void>;
}

export function useOrderRefundForm({
  order,
  onOpenChange,
  onRefundProcessed,
}: UseOrderRefundFormParams): UseOrderRefundFormReturn {
  const orderTotal = parseOrderTotal(order);
  const [amount, setAmount] = useState(orderTotal.toString());
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback((): void => {
    setAmount(orderTotal.toString());
    setReason('');
    setNotes('');
  }, [orderTotal]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!reason) {
      setError('Please select a reason');
      return;
    }

    const refundAmount = Number.parseFloat(amount);
    if (!Number.isFinite(refundAmount) || refundAmount <= 0) {
      setError('Please enter a valid refund amount');
      return;
    }

    if (refundAmount > orderTotal) {
      setError(`Refund amount cannot exceed order total (Rp ${orderTotal.toLocaleString('id-ID')})`);
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await adminService.processRefund(order.id, {
        amount: refundAmount,
        reason,
        notes: notes || undefined,
      });
      onRefundProcessed?.();
      onOpenChange(false);
      resetForm();
    } catch (refundError) {
      setError(refundError instanceof Error ? refundError.message : 'Failed to process refund');
    } finally {
      setIsLoading(false);
    }
  }, [amount, notes, onOpenChange, onRefundProcessed, order.id, orderTotal, reason, resetForm]);

  return {
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
  };
}

function parseOrderTotal(order: AdminOrder): number {
  const rawTotal = order.total_amount || order.total || 0;
  if (typeof rawTotal === 'number') return rawTotal;

  const parsedTotal = Number.parseFloat(String(rawTotal));
  return Number.isFinite(parsedTotal) ? parsedTotal : 0;
}
