'use client';

import { useEffect } from 'react';
import { motion } from 'framer-motion';
import { Ticket, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PromoCode } from '@/services/admin';
import { usePromoForm, PromoFormData } from '@/hooks/usePromoForm';

interface PromoModalProps {
  open: boolean;
  initial: PromoCode | null;
  onClose: () => void;
  onSaved: () => void;
}

const defaultForm: PromoFormData = {
  code: '',
  description: '',
  discount_type: 'percentage',
  discount_value: 10,
  min_order_amount: 0,
  max_discount_amount: 0,
  usage_limit: 100,
  usage_limit_per_user: 1,
  valid_from: new Date().toISOString().split('T')[0],
  valid_to: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
  is_active: true,
};

export function PromoModal({ open, initial, onClose, onSaved }: PromoModalProps) {
  const { form, updateForm, isSaving, handleSave, resetForm } = usePromoForm(onSaved);

  useEffect(() => {
    if (initial) {
      updateForm({
        code: initial.code,
        description: initial.description ?? '',
        discount_type: initial.discount_type,
        discount_value: Number(initial.discount_value),
        min_order_amount: Number(initial.min_order_amount),
        max_discount_amount: Number(initial.max_discount_amount ?? 0),
        usage_limit: initial.usage_limit ?? 0,
        usage_limit_per_user: initial.usage_limit_per_user,
        valid_from: initial.valid_from?.split('T')[0] ?? '',
        valid_to: initial.valid_to?.split('T')[0] ?? '',
        is_active: initial.is_active,
      });
    } else {
      resetForm();
    }
  }, [initial, open, updateForm, resetForm]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-lg bg-card border border-border rounded-xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-2">
            <Ticket className="h-4 w-4 text-primary" />
            <h2 className="font-semibold">{initial ? 'Edit Promo Code' : 'Tambah Promo Code'}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground transition-colors"
          >
            <XCircle className="h-5 w-5" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Code */}
          <div className="space-y-1.5">
            <Label>Kode Promo *</Label>
            <Input
              value={form.code}
              onChange={(e) => updateForm({ code: e.target.value.toUpperCase() })}
              placeholder="cth: HEMAT50"
              className="font-mono uppercase"
              disabled={!!initial}
            />
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <Label>Deskripsi</Label>
            <Input
              value={form.description}
              onChange={(e) => updateForm({ description: e.target.value })}
              placeholder="Opsional"
            />
          </div>

          {/* Discount type + value */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Tipe Diskon</Label>
              <select
                value={form.discount_type}
                onChange={(e) => updateForm({ discount_type: e.target.value as 'percentage' | 'fixed' })}
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
              >
                <option value="percentage">Persentase (%)</option>
                <option value="fixed">Nominal (Rp)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <Label>Nilai Diskon *</Label>
              <Input
                type="number"
                min={0}
                value={form.discount_value}
                onChange={(e) => updateForm({ discount_value: Number(e.target.value) })}
                placeholder={form.discount_type === 'percentage' ? '10' : '50000'}
              />
            </div>
          </div>

          {/* Min order + max discount */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Min. Order (Rp)</Label>
              <Input
                type="number"
                min={0}
                value={form.min_order_amount}
                onChange={(e) => updateForm({ min_order_amount: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Maks. Diskon (Rp)</Label>
              <Input
                type="number"
                min={0}
                value={form.max_discount_amount}
                onChange={(e) => updateForm({ max_discount_amount: Number(e.target.value) })}
                placeholder="0 = tidak terbatas"
              />
            </div>
          </div>

          {/* Usage limit */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Maks. Penggunaan Total</Label>
              <Input
                type="number"
                min={1}
                value={form.usage_limit}
                onChange={(e) => updateForm({ usage_limit: Number(e.target.value) })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Maks. per User</Label>
              <Input
                type="number"
                min={1}
                value={form.usage_limit_per_user}
                onChange={(e) => updateForm({ usage_limit_per_user: Number(e.target.value) })}
              />
            </div>
          </div>

          {/* Date range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label>Berlaku Dari</Label>
              <Input
                type="date"
                value={form.valid_from}
                onChange={(e) => updateForm({ valid_from: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Berlaku Sampai</Label>
              <Input
                type="date"
                value={form.valid_to}
                onChange={(e) => updateForm({ valid_to: e.target.value })}
              />
            </div>
          </div>

          {/* Active toggle */}
          <div className="flex items-center justify-between rounded-lg border border-border p-3">
            <div>
              <p className="text-sm font-medium">Status Aktif</p>
              <p className="text-xs text-muted-foreground">Promo dapat digunakan oleh pelanggan</p>
            </div>
            <button
              type="button"
              onClick={() => updateForm({ is_active: !form.is_active })}
              className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${
                form.is_active ? 'bg-primary' : 'bg-muted'
              }`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform duration-200 ${
                  form.is_active ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-border flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button
            onClick={() => handleSave(initial)}
            disabled={isSaving}
            className="gap-2"
          >
            {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
            {initial ? 'Simpan Perubahan' : 'Buat Promo'}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}
