import { useCallback, useMemo, useState } from 'react';
import { adminService } from '@/services/admin';
import type { OrderStatus } from '@/types';

const VALID_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  pending: ['payment_confirmed', 'cancelled'],
  payment_confirmed: ['processing', 'cancelled'],
  processing: ['shipped', 'cancelled'],
  shipped: ['delivered'],
  delivered: [],
  completed: [],
  refund_requested: ['refunded', 'refund_rejected'],
  refund_rejected: [],
  cancelled: [],
  refunded: [],
};

interface UseOrderStatusUpdateParams {
  orderId: string;
  currentStatus: OrderStatus;
  targetStatus: OrderStatus;
  requiresTracking?: boolean;
  onOpenChange: (open: boolean) => void;
  onStatusUpdated?: () => void;
}

interface UseOrderStatusUpdateReturn {
  notes: string;
  trackingNumber: string;
  isLoading: boolean;
  error: string | null;
  validTransitions: OrderStatus[];
  canUpdate: boolean;
  setNotes: (notes: string) => void;
  setTrackingNumber: (trackingNumber: string) => void;
  generateDummyTrackingNumber: () => void;
  handleSubmit: () => Promise<void>;
}

function createDummyTrackingNumber(): string {
  const datePart = new Date()
    .toISOString()
    .slice(0, 10)
    .replace(/-/g, '');
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();

  return `DUMMY-${datePart}-${randomPart}`;
}

export function useOrderStatusUpdate({
  orderId,
  currentStatus,
  targetStatus,
  requiresTracking = false,
  onOpenChange,
  onStatusUpdated,
}: UseOrderStatusUpdateParams): UseOrderStatusUpdateReturn {
  const [notes, setNotes] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validTransitions = useMemo(
    () => VALID_TRANSITIONS[currentStatus] || [],
    [currentStatus]
  );
  const canUpdate = validTransitions.includes(targetStatus);

  const generateDummyTrackingNumber = useCallback((): void => {
    setTrackingNumber(createDummyTrackingNumber());
    setError(null);
  }, []);

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!canUpdate) {
      setError('This status transition is not allowed');
      return;
    }

    if (requiresTracking && trackingNumber.trim().length === 0) {
      setError('Tracking number is required before marking this order as shipped');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      if (requiresTracking) {
        await adminService.updateOrderTracking(orderId, {
          tracking_number: trackingNumber.trim(),
        });
      }

      await adminService.updateOrderStatus(orderId, {
        status: targetStatus,
        notes: notes || undefined,
      });
      onStatusUpdated?.();
      onOpenChange(false);
      setNotes('');
      setTrackingNumber('');
    } catch (statusError) {
      setError(statusError instanceof Error ? statusError.message : 'Failed to update status');
    } finally {
      setIsLoading(false);
    }
  }, [
    canUpdate,
    notes,
    onOpenChange,
    onStatusUpdated,
    orderId,
    requiresTracking,
    targetStatus,
    trackingNumber,
  ]);

  return {
    notes,
    trackingNumber,
    isLoading,
    error,
    validTransitions,
    canUpdate,
    generateDummyTrackingNumber,
    setNotes,
    setTrackingNumber,
    handleSubmit,
  };
}
