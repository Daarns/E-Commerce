'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface CheckoutPolicyDialogProps {
  type: 'terms' | 'privacy';
}

const POLICY_CONTENT = {
  terms: {
    trigger: 'Syarat dan Ketentuan',
    title: 'Syarat dan Ketentuan',
    description:
      'Dengan melanjutkan pesanan, Anda menyetujui aturan transaksi dan pemrosesan order di platform ini.',
    sections: [
      'Pastikan alamat, nomor telepon, pilihan produk, varian, jumlah, dan metode pengiriman sudah benar sebelum membuat pesanan.',
      'Pesanan akan diproses setelah pembayaran dikonfirmasi oleh penyedia pembayaran. Status pembayaran dan fulfillment dapat berubah mengikuti hasil verifikasi sistem.',
      'Stok, harga, voucher, dan biaya pengiriman divalidasi ulang oleh server saat checkout untuk menjaga keakuratan transaksi.',
      'Pembatalan, pengembalian dana, atau perubahan pesanan mengikuti status order dan kebijakan operasional toko.',
    ],
  },
  privacy: {
    trigger: 'Kebijakan Privasi',
    title: 'Kebijakan Privasi',
    description:
      'Kami menggunakan data yang diperlukan untuk memproses checkout, pembayaran, pengiriman, dan dukungan pelanggan.',
    sections: [
      'Data alamat, nama penerima, nomor telepon, email, item pesanan, dan ringkasan pembayaran disimpan sebagai snapshot order.',
      'Data checkout yang relevan dapat dikirim ke penyedia pembayaran seperti Midtrans untuk membuat transaksi dan menampilkan instruksi pembayaran.',
      'Informasi pembayaran sensitif diproses oleh penyedia pembayaran. Platform tidak menyimpan detail kartu atau kredensial pembayaran pengguna.',
      'Data order digunakan untuk tracking, fulfillment, notifikasi, dukungan pelanggan, audit transaksi, dan kebutuhan keamanan akun.',
    ],
  },
} as const;

export function CheckoutPolicyDialog({ type }: CheckoutPolicyDialogProps) {
  const content = POLICY_CONTENT[type];

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button
            type="button"
            variant="link"
            className="h-auto p-0 text-sm text-primary"
          />
        }
      >
        {content.trigger}
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{content.title}</DialogTitle>
          <DialogDescription>{content.description}</DialogDescription>
        </DialogHeader>
        <div className="space-y-3 text-sm text-muted-foreground">
          {content.sections.map((section) => (
            <p key={section}>{section}</p>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
