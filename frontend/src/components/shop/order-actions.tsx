'use client';

import { Order } from '@/types';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { CheckCircle2, CreditCard, FileText, Phone, RefreshCw, RotateCcw, Trash2, X } from 'lucide-react';
import { useOrderDetailActions } from '@/hooks/useOrderDetailActions';
import { CUSTOMER_REFUND_REASON_OPTIONS } from '@/constants/refund.constants';

interface OrderActionsProps {
  order: Order;
  onOrderUpdated?: (updatedOrder: Order) => void;
}

export function OrderActions({ order, onOrderUpdated }: OrderActionsProps) {
  const {
    isLoading,
    error,
    openCancelDialog,
    setOpenCancelDialog,
    openRefundDialog,
    setOpenRefundDialog,
    refundReason,
    setRefundReason,
    refundDescription,
    setRefundDescription,
    refundEvidenceImages,
    canCancel,
    canConfirmReceived,
    canRequestRefund,
    canRetryPayment,
    canSyncPayment,
    handleCancelOrder,
    handleConfirmReceived,
    handleRetryPayment,
    handleSyncPayment,
    handleContactSupport,
    handleViewInvoice,
    handleRefundEvidenceImagesChange,
    removeRefundEvidenceImage,
    handleRequestRefund,
    clearError,
  } = useOrderDetailActions(order, onOrderUpdated);
  const status = order.status || order.order_status;

  return (
    <div className="bg-white rounded-lg border p-6">
      <h3 className="text-lg font-semibold mb-4">Order Actions</h3>

      {error && !openRefundDialog && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {canRetryPayment && (
          <Button
            onClick={() => void handleRetryPayment()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <CreditCard className="w-4 h-4" />
            {isLoading ? 'Loading...' : 'Retry Payment'}
          </Button>
        )}

        {canSyncPayment && (
          <Button
            variant="outline"
            onClick={() => void handleSyncPayment()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Sync Payment
          </Button>
        )}

        {canConfirmReceived && (
          <Button
            onClick={() => void handleConfirmReceived()}
            disabled={isLoading}
            className="flex items-center gap-2"
          >
            <CheckCircle2 className="w-4 h-4" />
            {isLoading ? 'Memproses...' : 'Pesanan Diterima'}
          </Button>
        )}

        {/* Contact Support */}
        <Button
          variant="outline"
          onClick={handleContactSupport}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <Phone className="w-4 h-4" />
          Chat CS
        </Button>

        {/* View Invoice */}
        <Button
          variant="outline"
          onClick={handleViewInvoice}
          disabled={isLoading}
          className="flex items-center gap-2"
        >
          <FileText className="w-4 h-4" />
          View Invoice
        </Button>

        {/* Request Refund */}
        {canRequestRefund && (
          <Dialog
            open={openRefundDialog}
            onOpenChange={(open) => {
              setOpenRefundDialog(open);
              if (!open) clearError();
            }}
          >
            <DialogTrigger
              render={
                <Button
                  variant="outline"
                  disabled={isLoading}
                  className="flex items-center gap-2 w-full"
                />
              }
            >
              <RotateCcw className="w-4 h-4" />
              Ajukan Refund
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Ajukan Refund</DialogTitle>
                <DialogDescription>
                  Refund dapat diajukan maksimal 7 hari setelah pesanan dikonfirmasi selesai.
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col gap-4">
                {error && (
                  <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
                    {error}
                  </div>
                )}
                <p className="text-sm text-gray-600">
                  <strong>Estimasi nominal:</strong> Rp {Number(order.total_amount ?? order.total ?? 0).toLocaleString('id-ID')}
                </p>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Alasan refund
                  </label>
                  <select
                    value={refundReason}
                    onChange={(event) => setRefundReason(event.target.value)}
                    disabled={isLoading}
                    className="h-10 w-full rounded-md border border-input bg-white px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    <option value="">Pilih alasan refund</option>
                    {CUSTOMER_REFUND_REASON_OPTIONS.map((reason) => (
                      <option key={reason.value} value={reason.label}>
                        {reason.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Detail refund
                  </label>
                  <Textarea
                    value={refundDescription}
                    onChange={(event) => setRefundDescription(event.target.value)}
                    placeholder="Jelaskan kondisi produk, kronologi, dan bukti yang dilampirkan."
                    rows={3}
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <label className="mb-2 block text-sm font-medium text-gray-700">
                    Bukti gambar (maksimal 3)
                  </label>
                  <Input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(event) => {
                      handleRefundEvidenceImagesChange(event.target.files);
                      event.currentTarget.value = '';
                    }}
                    disabled={isLoading}
                  />
                  {refundEvidenceImages.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {refundEvidenceImages.map((image, index) => (
                        <div
                          key={`${image.name}-${image.lastModified}`}
                          className="flex items-center justify-between rounded-md border bg-gray-50 px-3 py-2 text-sm"
                        >
                          <span className="truncate pr-3">{image.name}</span>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 shrink-0"
                            onClick={() => removeRefundEvidenceImage(index)}
                            disabled={isLoading}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 justify-end">
                  <Button
                    variant="outline"
                    onClick={() => setOpenRefundDialog(false)}
                    disabled={isLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => void handleRequestRefund()}
                    disabled={isLoading || refundReason.trim().length === 0 || refundDescription.trim().length === 0}
                  >
                    {isLoading ? 'Processing...' : 'Ajukan Refund'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}

        {/* Cancel Order */}
        {canCancel && (
          <Dialog open={openCancelDialog} onOpenChange={setOpenCancelDialog}>
            <DialogTrigger
              render={
                <Button
                  variant="destructive"
                  disabled={isLoading}
                  className="flex items-center gap-2 w-full"
                />
              }
            >
              <Trash2 className="w-4 h-4" />
              Cancel Order
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Cancel Order</DialogTitle>
                <DialogDescription>
                  Are you sure you want to cancel this order? This action cannot be undone.
                </DialogDescription>
              </DialogHeader>
              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => setOpenCancelDialog(false)}
                  disabled={isLoading}
                >
                  Keep Order
                </Button>
                <Button
                  variant="destructive"
                  onClick={handleCancelOrder}
                  disabled={isLoading}
                >
                  {isLoading ? 'Cancelling...' : 'Cancel Order'}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {!canCancel && status === 'pending' && (
        <p className="text-sm text-gray-500 mt-4">
          This order cannot be cancelled as it is already {order.status}.
        </p>
      )}
    </div>
  );
}
