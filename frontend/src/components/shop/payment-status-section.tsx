'use client';

import {
  PAYMENT_STATUS_LABELS,
  PAYMENT_STATUS_PANEL_COLORS,
} from '@/constants/order.constants';
import { Order, PaymentStatus } from '@/types';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

const formatPrice = (price: string | number | undefined): number => {
  if (typeof price === 'number') return price;
  return parseFloat(String(price || 0)) || 0;
};

function getPaymentStatusIcon(status: PaymentStatus) {
  switch (status) {
    case 'paid':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'unpaid':
      return <Clock className="w-5 h-5 text-yellow-500" />;
    case 'failed':
      return <XCircle className="w-5 h-5 text-red-500" />;
    case 'refunded':
      return <CheckCircle className="w-5 h-5 text-blue-500" />;
    case 'expired':
      return <AlertCircle className="w-5 h-5 text-red-500" />;
    default:
      return null;
  }
}

function getPaymentStatusColor(status: PaymentStatus): string {
  return PAYMENT_STATUS_PANEL_COLORS[status];
}

export function PaymentStatusSection({ order }: { order: Order }) {
  return (
    <div className={`rounded-lg border p-6 ${getPaymentStatusColor(order.payment_status)}`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-lg font-semibold mb-4">Payment Information</h3>
          
          <div className="space-y-3">
            <div>
              <p className="text-sm text-gray-600">Payment Method</p>
              <p className="font-medium capitalize">
                {order.payment_method?.replace('-', ' ') || 'Not specified'}
              </p>
            </div>
            
            <div>
              <p className="text-sm text-gray-600">Payment Status</p>
              <div className="flex items-center gap-2 mt-1">
                {getPaymentStatusIcon(order.payment_status)}
                <p className="font-medium">{PAYMENT_STATUS_LABELS[order.payment_status]}</p>
              </div>
            </div>
            
            {order.payment_status === 'paid' && (
              <div>
                <p className="text-sm text-gray-600">Total Amount Paid</p>
                <p className="font-medium text-lg">
                  Rp {(typeof (order.total_amount || order.total) === 'number' ? (order.total_amount || order.total) : parseFloat(String(order.total_amount || order.total || 0))).toLocaleString('id-ID')}
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Payment Details Summary */}
        <div className="bg-white rounded p-4 w-64">
          <h4 className="font-semibold text-sm mb-3">Order Summary</h4>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Subtotal</span>
              <span>Rp {formatPrice(order.subtotal).toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span>Rp {formatPrice(order.shipping_cost).toLocaleString('id-ID')}</span>
            </div>
            {formatPrice(order.discount_amount) > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-Rp {formatPrice(order.discount_amount).toLocaleString('id-ID')}</span>
              </div>
            )}
            {formatPrice(order.tax_amount) > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>Rp {formatPrice(order.tax_amount).toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>Rp {formatPrice(order.total_amount || order.total).toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
