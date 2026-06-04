import { useCallback, useState } from 'react';
import { adminService, type AdminOrder } from '@/services/admin';

interface UseOrderRefundRejectionFormParams {
  order: AdminOrder;
  onOpenChange: (open: boolean) => void;
  onRefundRejected?: () => void;
}

interface UseOrderRefundRejectionFormReturn {
  reason: string;
  notes: string;
  isLoading: boolean;
  error: string | null;
  setReason: (reason: string) => void;
  setNotes: (notes: string) => void;
  handleSubmit: () => Promise<void>;
}

export function useOrderRefundRejectionForm({
  order,
  onOpenChange,
  onRefundRejected,
}: UseOrderRefundRejectionFormParams): UseOrderRefundRejectionFormReturn {
  const [reason, setReason] = useState('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = useCallback((): void => {
    setReason('');
    setNotes('');
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (): Promise<void> => {
    const trimmedReason = reason.trim();
    if (!trimmedReason) {
      setError('Please select a rejection reason');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await adminService.rejectRefund(order.id, {
        reason: trimmedReason,
        notes: notes.trim() || undefined,
      });
      onRefundRejected?.();
      onOpenChange(false);
      resetForm();
    } catch (rejectError) {
      setError(rejectError instanceof Error ? rejectError.message : 'Failed to reject refund');
    } finally {
      setIsLoading(false);
    }
  }, [notes, onOpenChange, onRefundRejected, order.id, reason, resetForm]);

  return {
    reason,
    notes,
    isLoading,
    error,
    setReason,
    setNotes,
    handleSubmit,
  };
}
