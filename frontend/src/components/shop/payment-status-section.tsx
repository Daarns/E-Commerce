'use client';

import { Order, PaymentStatus } from '@/types';
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react';

function getPaymentStatusIcon(status: PaymentStatus) {
  switch (status) {
    case 'paid':
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    case 'pending':
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

function getPaymentStatusLabel(status: PaymentStatus): string {
  const labels: Record<PaymentStatus, string> = {
    paid: 'Paid',
    pending: 'Pending',
    failed: 'Failed',
    refunded: 'Refunded',
    expired: 'Expired',
  };
  return labels[status];
}

function getPaymentStatusColor(status: PaymentStatus): string {
  switch (status) {
    case 'paid':
      return 'bg-green-50 border-green-200';
    case 'pending':
      return 'bg-yellow-50 border-yellow-200';
    case 'failed':
      return 'bg-red-50 border-red-200';
    case 'refunded':
      return 'bg-blue-50 border-blue-200';
    case 'expired':
      return 'bg-red-50 border-red-200';
    default:
      return 'bg-gray-50 border-gray-200';
  }
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
                <p className="font-medium">{getPaymentStatusLabel(order.payment_status)}</p>
              </div>
            </div>
            
            {order.payment_status === 'paid' && (
              <div>
                <p className="text-sm text-gray-600">Total Amount Paid</p>
                <p className="font-medium text-lg">
                  Rp {order.total_amount.toLocaleString('id-ID')}
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
              <span>Rp {order.subtotal.toLocaleString('id-ID')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Shipping</span>
              <span>Rp {order.shipping_cost.toLocaleString('id-ID')}</span>
            </div>
            {order.discount_amount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount</span>
                <span>-Rp {order.discount_amount.toLocaleString('id-ID')}</span>
              </div>
            )}
            {order.tax_amount > 0 && (
              <div className="flex justify-between">
                <span className="text-gray-600">Tax</span>
                <span>Rp {order.tax_amount.toLocaleString('id-ID')}</span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between font-semibold">
              <span>Total</span>
              <span>Rp {order.total_amount.toLocaleString('id-ID')}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
