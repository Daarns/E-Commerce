'use client';

import Image from 'next/image';
import { AdminOrder } from '@/services/admin';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/constants/product.constants';
import {
  formatCurrency,
  getProductImageForCombination,
  getProductImageUrl,
  toNum,
} from '@/utils';

interface OrderItemsSectionProps {
  items: AdminOrder['items'];
}

export function OrderItemsSection({ items }: OrderItemsSectionProps) {
  return (
    <div className="overflow-hidden rounded-lg border">
      <div className="border-b bg-gray-50 p-6">
        <h3 className="font-semibold text-gray-900">Order Items</h3>
      </div>
      <div className="divide-y">
        {items.map((item) => {
          const combinationImage = getProductImageForCombination(
            item.product?.images,
            item.combination
          );
          const itemImageUrl = getProductImageUrl(combinationImage)
            ?? item.product_image
            ?? PLACEHOLDER_PRODUCT_IMAGE;

          return (
            <div key={item.id} className="flex gap-4 p-6">
              <div className="relative h-16 w-16 flex-shrink-0 overflow-hidden rounded bg-gray-100">
                <Image
                  src={itemImageUrl}
                  alt={item.product_name}
                  fill
                  className="object-cover"
                  sizes="64px"
                />
              </div>
              <div className="flex-1">
                <p className="font-medium text-gray-900">{item.product_name}</p>
                <p className="mt-1 text-sm text-gray-500">
                  Qty: <span className="font-medium">{item.quantity}</span>
                </p>
                <p className="text-sm text-gray-500">
                  Unit Price: {formatCurrency(toNum(item.unit_price))}
                </p>
              </div>
              <div className="text-right">
                <p className="font-semibold text-gray-900">
                  {formatCurrency(toNum(item.total_price || item.subtotal))}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
