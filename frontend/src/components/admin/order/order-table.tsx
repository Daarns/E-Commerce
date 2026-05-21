'use client';

import { AdminOrder } from '@/services/admin';
import { OrderStatus, PaymentStatus } from '@/types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  ADMIN_ORDER_STATUS_LABELS,
  ORDER_STATUS_BADGE_COLORS,
  PAYMENT_STATUS_BADGE_COLORS,
  PAYMENT_STATUS_LABELS,
} from '@/constants/order.constants';
import { Eye } from 'lucide-react';
import Link from 'next/link';

interface OrderTableProps {
  orders: AdminOrder[];
  isLoading?: boolean;
  onView?: (order: AdminOrder) => void;
  onEdit?: (order: AdminOrder) => void;
  onDelete?: (order: AdminOrder) => void;
}

function getStatusBadgeColor(status: OrderStatus) {
  return ORDER_STATUS_BADGE_COLORS[status];
}

function getPaymentBadgeColor(status: PaymentStatus) {
  return PAYMENT_STATUS_BADGE_COLORS[status];
}

function formatStatusLabel(status: OrderStatus): string {
  return ADMIN_ORDER_STATUS_LABELS[status];
}

function formatPaymentLabel(status: PaymentStatus): string {
  return PAYMENT_STATUS_LABELS[status];
}

export function OrderTable({ orders, isLoading }: OrderTableProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900" />
      </div>
    );
  }

  if (orders.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">No orders found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Order</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Customer</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Total</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Status</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Payment</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Date</th>
              <th className="px-6 py-3 text-left text-sm font-semibold text-gray-900">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {orders.map((order) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-mono text-sm text-blue-600 hover:underline"
                  >
                    #{order.order_number}
                  </Link>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm">
                    <p className="font-medium text-gray-900">
                      {order.shipping_name || 'N/A'}
                    </p>
                    <p className="text-gray-500 text-xs">{order.shipping_phone || 'N/A'}</p>
                  </div>
                </td>
                <td className="px-6 py-4">
                  <p className="font-semibold text-gray-900">
                    Rp {Number(order.total_amount || order.total || 0).toLocaleString('id-ID')}
                  </p>
                </td>
                <td className="px-6 py-4">
                  <Badge className={getStatusBadgeColor(order.status || order.order_status)}>
                    {formatStatusLabel(order.status || order.order_status)}
                  </Badge>
                </td>
                <td className="px-6 py-4">
                  <Badge className={getPaymentBadgeColor(order.payment_status)}>
                    {formatPaymentLabel(order.payment_status)}
                  </Badge>
                </td>
                <td className="px-6 py-4 text-sm text-gray-600">
                  {new Date(order.created_at).toLocaleDateString('id-ID')}
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    <Link href={`/admin/orders/${order.id}`}>
                      <Button variant="ghost" size="icon" title="View Order">
                        <Eye className="w-4 h-4" />
                      </Button>
                    </Link>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
