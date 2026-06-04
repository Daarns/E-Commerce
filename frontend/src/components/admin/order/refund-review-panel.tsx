'use client';

import Image from 'next/image';
import type { AdminOrder } from '@/services/admin';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { getRefundRequestInfo } from '@/utils';
import { formatDateTime } from '@/utils';
import { RefundForm } from '@/components/admin/order/refund-form';
import { RefundRejectionForm } from '@/components/admin/order/refund-rejection-form';
import { useState } from 'react';
import {
  ADMIN_ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
} from '@/constants/order.constants';

interface RefundReviewPanelProps {
  order: AdminOrder;
  onRefundProcessed?: () => void;
}

export function RefundReviewPanel({ order, onRefundProcessed }: RefundReviewPanelProps) {
  const [refundDialogOpen, setRefundDialogOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const refundInfo = getRefundRequestInfo(order);
  const refundImages = (order.refund_images ?? []).filter((image) => (
    (image.refund_attempt ?? 1) === refundInfo.attemptNumber
  ));
  const orderStatus = order.status || order.order_status;
  const canProcessRefund = orderStatus === 'refund_requested' && order.payment_status === 'paid';

  return (
    <Card className="p-6">
      <div className="mb-5 flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Refund Review</h2>
          <p className="mt-1 text-sm text-gray-600">
            Periksa alasan, detail, bukti gambar, dan nominal sebelum memproses refund.
          </p>
        </div>
        <Badge className={canProcessRefund ? 'bg-orange-100 text-orange-800' : 'bg-gray-100 text-gray-800'}>
          {canProcessRefund ? 'Review Needed' : ADMIN_ORDER_STATUS_LABELS[orderStatus]}
        </Badge>
      </div>

      <div className="space-y-5">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Alasan user</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">{refundInfo.reason}</p>
          </div>
          <div className="rounded-lg border bg-gray-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Diajukan pada</p>
            <p className="mt-2 text-sm font-semibold text-gray-900">
              {refundInfo.requestedAt ? formatDateTime(refundInfo.requestedAt) : '-'}
            </p>
          </div>
        </div>

        <div className="rounded-lg border p-4">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Detail dari user</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-gray-800">
            {refundInfo.description || 'Tidak ada detail refund tercatat.'}
          </p>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-900">Bukti gambar</p>
            <span className="text-xs text-gray-500">{refundImages.length}/3 gambar</span>
          </div>
          {refundImages.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-3">
              {refundImages.map((image) => (
                <a
                  key={image.id}
                  href={image.image_url}
                  target="_blank"
                  rel="noreferrer"
                  className="group overflow-hidden rounded-lg border bg-white"
                >
                  <Image
                    src={image.image_url}
                    alt="Bukti refund"
                    width={320}
                    height={220}
                    unoptimized
                    className="h-44 w-full object-cover transition-transform group-hover:scale-105"
                  />
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-lg border border-dashed py-8 text-center text-sm text-gray-500">
              User tidak mengunggah bukti gambar.
            </div>
          )}
        </div>

        <div className="grid gap-4 rounded-lg border bg-gray-50 p-4 md:grid-cols-3">
          <div>
            <p className="text-xs text-gray-500">Order total</p>
            <p className="text-sm font-semibold text-gray-900">
              Rp {Number(order.total_amount || order.total || 0).toLocaleString('id-ID')}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Payment</p>
            <p className="text-sm font-semibold text-gray-900">
              {PAYMENT_STATUS_LABELS[order.payment_status]}
            </p>
          </div>
          <div>
            <p className="text-xs text-gray-500">Order status</p>
            <p className="text-sm font-semibold text-gray-900">
              {ADMIN_ORDER_STATUS_LABELS[orderStatus]}
            </p>
          </div>
        </div>

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            onClick={() => setRejectDialogOpen(true)}
            disabled={!canProcessRefund}
            variant="outline"
            className="w-full border-red-200 text-red-700 hover:bg-red-50 hover:text-red-800"
          >
            Reject Refund
          </Button>
          <Button
            type="button"
            onClick={() => setRefundDialogOpen(true)}
            disabled={!canProcessRefund}
            variant="destructive"
            className="w-full"
          >
            Process Requested Refund
          </Button>
        </div>
      </div>

      <RefundForm
        order={order}
        open={refundDialogOpen}
        onOpenChange={setRefundDialogOpen}
        onRefundProcessed={onRefundProcessed}
      />
      <RefundRejectionForm
        order={order}
        open={rejectDialogOpen}
        onOpenChange={setRejectDialogOpen}
        onRefundRejected={onRefundProcessed}
      />
    </Card>
  );
}
