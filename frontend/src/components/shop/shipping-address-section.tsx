'use client';

import { Order } from '@/types';
import { MapPin } from 'lucide-react';

export function ShippingAddressSection({ order }: { order: Order }) {
  const address = order.shipping_address;

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex items-start gap-3 mb-4">
        <MapPin className="w-5 h-5 text-gray-600 flex-shrink-0 mt-0.5" />
        <h3 className="text-lg font-semibold">Shipping Address</h3>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-sm text-gray-600">Recipient</p>
          <p className="font-medium">{address.recipient_name}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Phone</p>
          <p className="font-medium">{address.phone}</p>
        </div>

        <div>
          <p className="text-sm text-gray-600">Address</p>
          <p className="font-medium">{address.street_address}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">City</p>
            <p className="font-medium">{address.city}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Province</p>
            <p className="font-medium">{address.province}</p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-gray-600">Postal Code</p>
            <p className="font-medium">{address.postal_code}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Country</p>
            <p className="font-medium">{address.country}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
