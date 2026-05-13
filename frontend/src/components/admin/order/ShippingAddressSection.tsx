'use client';

import { AdminOrder } from '@/services/admin';
import { Card } from '@/components/ui/card';

interface ShippingAddressSectionProps {
  address: AdminOrder['shipping_address'];
  name?: string;
  phone?: string;
  trackingNumber?: string;
}

export function ShippingAddressSection({
  address,
  name,
  phone,
  trackingNumber,
}: ShippingAddressSectionProps) {
  return (
    <Card className="p-6">
      <h3 className="mb-4 font-semibold text-gray-900">Shipping Address</h3>
      <div className="space-y-3 text-sm">
        <div>
          <p className="text-gray-600">Recipient</p>
          <p className="font-medium">{address?.recipient_name || name}</p>
        </div>
        <div>
          <p className="text-gray-600">Phone</p>
          <p className="font-medium">{address?.phone || phone}</p>
        </div>
        <div>
          <p className="text-gray-600">Address</p>
          <p className="font-medium">{address?.street_address}</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-gray-600">City</p>
            <p className="font-medium">{address?.city}</p>
          </div>
          <div>
            <p className="text-gray-600">Province</p>
            <p className="font-medium">{address?.province}</p>
          </div>
        </div>
        {trackingNumber && (
          <div>
            <p className="text-gray-600">Tracking Number</p>
            <p className="font-mono">{trackingNumber}</p>
          </div>
        )}
      </div>
    </Card>
  );
}
