import { useCallback, useMemo, useState } from 'react';
import { adminService } from '@/services/admin';
import type { OrderStatus } from '@/types';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['payment_confirmed', 'cancelled'],
  payment_confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: ['refunded'],
  cancelled: [],
  refunded: [],
};

interface UseOrderStatusUpdateParams {
  orderId: string;
  currentStatus: OrderStatus;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
}

interface UseOrderStatusUpdateReturn {
  newStatus: OrderStatus | '';
  notes: string;
  isLoading: boolean;
  error: string | null;
  validTransitions: OrderStatus[];
  canUpdate: boolean;
  setNewStatus: (status: OrderStatus | '') => void;
  setNotes: (notes: string) => void;
  handleSubmit: () => Promise<void>;
}

export function useOrderStatusUpdate({
  orderId,
  currentStatus,
  onOpenChange,
  onStatusUpdated,
}: UseOrderStatusUpdateParams): UseOrderStatusUpdateReturn {
  const [newStatus, setNewStatus] = useState<OrderStatus | ''>('');
  const [notes, setNotes] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validTransitions = useMemo(
    () => VALID_TRANSITIONS[currentStatus] || [],
    [currentStatus]
  );
  const canUpdate = validTransitions.length > 0;

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!newStatus) {
      setError('Please select a new status');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      await adminService.updateOrderStatus(orderId, {
        status: newStatus,
        notes: notes || undefined,
      });
      onStatusUpdated?.();
      onOpenChange(false);
      setNewStatus('');
      setNotes('');
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update status');
    } finally {
      setIsLoading(false);
    }
  }, [newStatus, notes, onOpenChange, onStatusUpdated, orderId]);

  return {
    newStatus,
    notes,
    isLoading,
    error,
    validTransitions,
    canUpdate,
    setNewStatus,
    setNotes,
    handleSubmit,
  };
}
