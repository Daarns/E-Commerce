'use client';

import Link from 'next/link';
import type { AdminOrder } from '@/services/admin';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRefundRequestInfo } from '@/utils';
import { formatDate } from '@/utils';
import { Eye, Image as ImageIcon } from 'lucide-react';

interface RefundRequestTableProps {
  orders: AdminOrder[];
  isLoading?: boolean;
}

export function RefundRequestTable({ orders, isLoading }: RefundRequestTableProps) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center rounded-lg border bg-white">
        <div className="h-10 w-10 animate-spin rounded-full border-b-2 border-gray-900" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="rounded-lg border bg-white py-12 text-center">
        <p className="text-sm text-gray-500">Belum ada refund request yang perlu direview.</p>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-lg border bg-white">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="border-b bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Reason</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Evidence</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Tanggal Pengajuan</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => {
              const refundInfo = getRefundRequestInfo(order);
              const currentRefundImages = (order.refund_images ?? []).filter((image) => (
                (image.refund_attempt ?? 1) === refundInfo.attemptNumber
              ));

              return (
                <tr key={order.id} className="transition-colors hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <Link
                      href={`/admin/orders/refunds/${order.id}`}
                      className="font-mono text-sm text-blue-600 hover:underline"
                    >
                      #{order.order_number}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <p className="text-sm font-medium text-gray-900">{order.shipping_name || 'N/A'}</p>
                    <p className="text-xs text-gray-500">{order.shipping_phone || 'N/A'}</p>
                  </td>
                  <td className="max-w-xs px-6 py-4">
                    <p className="truncate text-sm text-gray-900">{refundInfo.reason}</p>
                    {refundInfo.description && (
                      <p className="truncate text-xs text-gray-500">{refundInfo.description}</p>
                    )}
                  </td>
                  <td className="px-6 py-4">
                    <Badge className="gap-1 bg-orange-100 text-orange-800">
                      <ImageIcon className="h-3 w-3" />
                      {currentRefundImages.length}
                    </Badge>
                  </td>
                  <td className="px-6 py-4 text-sm font-semibold text-gray-900">
                    Rp {Number(order.total_amount || order.total || 0).toLocaleString('id-ID')}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {refundInfo.requestedAt ? formatDate(refundInfo.requestedAt) : '-'}
                  </td>
                  <td className="px-6 py-4">
                    <Link href={`/admin/orders/refunds/${order.id}`}>
                      <Button variant="ghost" size="icon" title="Review refund">
                        <Eye className="h-4 w-4" />
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
