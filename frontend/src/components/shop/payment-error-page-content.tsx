'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, RefreshCw, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface PaymentErrorCopy {
  title: string;
  message: string;
}

function getPaymentErrorCopy(status: string | null): PaymentErrorCopy {
  switch (status) {
    case 'deny':
    case 'failure':
    case 'failed':
      return {
        title: 'Pembayaran ditolak',
        message:
          'Pembayaran belum berhasil diproses. Silakan pilih metode pembayaran lain atau coba lagi dari halaman order.',
      };
    case 'expire':
    case 'expired':
      return {
        title: 'Waktu pembayaran habis',
        message:
          'Sesi pembayaran sudah kedaluwarsa. Anda dapat membuat pembayaran ulang dari halaman order.',
      };
    case 'cancel':
    case 'cancelled':
      return {
        title: 'Pembayaran dibatalkan',
        message:
          'Pembayaran dibatalkan sebelum selesai. Order masih dapat dibayar ulang selama belum kedaluwarsa.',
      };
    case 'network':
      return {
        title: 'Koneksi pembayaran terganggu',
        message:
          'Kami tidak dapat terhubung ke layanan pembayaran. Periksa koneksi internet Anda lalu coba lagi.',
      };
    case 'unavailable':
      return {
        title: 'Layanan pembayaran belum tersedia',
        message:
          'Midtrans sedang tidak tersedia atau gateway pembayaran mengalami gangguan sementara. Silakan coba lagi beberapa saat lagi.',
      };
    default:
      return {
        title: 'Pembayaran belum berhasil',
        message:
          'Transaksi belum dapat diselesaikan. Hal ini bisa terjadi karena gangguan jaringan, sesi pembayaran ditutup, atau layanan pembayaran sedang sibuk.',
      };
  }
}

export function PaymentErrorPageContent() {
  const searchParams = useSearchParams();
  const transactionStatus = searchParams.get('transaction_status');
  const orderId = searchParams.get('order_id');
  const statusCode = searchParams.get('status_code');
  const copy = getPaymentErrorCopy(transactionStatus);

  return (
    <main className="min-h-screen bg-background px-4 py-16">
      <Dialog open>
        <DialogContent showCloseButton={false} className="sm:max-w-md">
          <DialogHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-red-50 text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <DialogTitle>{copy.title}</DialogTitle>
            <DialogDescription>{copy.message}</DialogDescription>
          </DialogHeader>

          {(orderId || statusCode || transactionStatus) && (
            <div className="rounded-md bg-muted p-3 text-xs text-muted-foreground">
              {orderId && <p>Order: {orderId}</p>}
              {transactionStatus && <p>Status: {transactionStatus}</p>}
              {statusCode && <p>Kode: {statusCode}</p>}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <Button asChild variant="outline">
              <Link href="/orders">
                <ShoppingBag className="mr-2 h-4 w-4" />
                Lihat Order
              </Link>
            </Button>
            <Button asChild>
              <Link href="/orders">
                <RefreshCw className="mr-2 h-4 w-4" />
                Coba Lagi
              </Link>
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </main>
  );
}
