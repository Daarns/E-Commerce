'use client';

import { Order } from '@/types';
import { getOrderItemImageUrl } from '@/utils';
import Image from 'next/image';
import Link from 'next/link';

const formatPrice = (price: string | number | undefined): number => {
  if (typeof price === 'number') return price;
  return parseFloat(String(price || 0)) || 0;
};

export function OrderItemsList({ order }: { order: Order }) {
  return (
    <div className="bg-white rounded-lg border overflow-hidden">
      <div className="p-6 border-b">
        <h3 className="text-lg font-semibold">Order Items</h3>
      </div>

      <div className="divide-y">
        {order.items.map((item) => {
          const imageUrl = getOrderItemImageUrl(item);

          return (
            <div key={item.id} className="p-6 flex gap-4">
              {/* Product Image */}
              <div className="relative w-20 h-20 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                {imageUrl && (
                  <Image
                    src={imageUrl}
                    alt={item.product_name}
                    fill
                    className="object-cover"
                    sizes="80px"
                  />
                )}
              </div>

              {/* Product Details */}
              <div className="flex-1">
                <Link
                  href={`/products/${item.product_id}`}
                  className="font-medium text-gray-900 hover:text-blue-600 transition-colors"
                >
                  {item.product_name}
                </Link>

                <p className="text-sm text-gray-500 mt-1">
                  Quantity: <span className="font-medium">{item.quantity}</span>
                </p>

                <p className="text-sm text-gray-500 mt-1">
                  Unit Price: <span className="font-medium">Rp {formatPrice(item.unit_price).toLocaleString('id-ID')}</span>
                </p>
              </div>

              {/* Price */}
              <div className="text-right">
                <p className="font-medium text-gray-900">
                  Rp {formatPrice(item.total_price).toLocaleString('id-ID')}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {item.quantity} × Rp {formatPrice(item.unit_price).toLocaleString('id-ID')}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Items Summary */}
      <div className="p-6 bg-gray-50">
        <div className="flex justify-between items-center">
          <span className="text-gray-600">Total Items</span>
          <span className="font-medium">
            {order.items.reduce((sum, item) => sum + item.quantity, 0)} item(s)
          </span>
        </div>
      </div>
    </div>
  );
}
