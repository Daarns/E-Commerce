'use client';

import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { PAYMENT_STATUS_BADGE_COLORS, PAYMENT_STATUS_LABELS } from '@/constants/order.constants';
import { PaymentStatus } from '@/types';

interface PaymentInfoSectionProps {
  method?: string;
  status: PaymentStatus;
}

export function PaymentInfoSection({ method, status }: PaymentInfoSectionProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-semibold text-gray-900">Payment Information</h3>
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-gray-600">Method</p>
          <p className="font-medium capitalize">{method?.replace('-', ' ') || 'N/A'}</p>
        </div>
        <div>
          <p className="text-gray-600">Status</p>
          <Badge className={PAYMENT_STATUS_BADGE_COLORS[status]}>
            {PAYMENT_STATUS_LABELS[status]}
          </Badge>
        </div>
      </div>
    </Card>
  );
}
