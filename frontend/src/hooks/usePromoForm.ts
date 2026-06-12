import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { promoAdminService, PromoCode, CreatePromoInput } from '@/services/admin';
import { handleError } from '@/utils/error-handler';

export interface PromoFormData {
  code: string;
  description: string;
  discount_type: 'percentage' | 'fixed';
  discount_value: number;
  min_order_amount: number;
  max_discount_amount: number;
  usage_limit: number;
  usage_limit_per_user: number;
  valid_from: string;
  valid_to: string;
  is_active: boolean;
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

interface UsePromoFormReturn {
  form: PromoFormData;
  updateForm: (updates: Partial<PromoFormData>) => void;
  isSaving: boolean;
  handleSave: (initial: PromoCode | null) => Promise<void>;
  resetForm: () => void;
}

export function usePromoForm(onSaved?: () => void): UsePromoFormReturn {
  const [form, setForm] = useState<PromoFormData>(defaultForm);
  const [isSaving, setIsSaving] = useState(false);

  const updateForm = useCallback((updates: Partial<PromoFormData>): void => {
    setForm((prev) => ({ ...prev, ...updates }));
  }, []);

  const resetForm = useCallback((): void => {
    setForm(defaultForm);
  }, []);

  const validateForm = useCallback((): boolean => {
    if (!form.code.trim()) {
      toast.error('Kode promo wajib diisi');
      return false;
    }
    if (form.discount_value <= 0) {
      toast.error('Nilai diskon harus > 0');
      return false;
    }
    if (form.valid_to < form.valid_from) {
      toast.error('Tanggal akhir harus setelah tanggal mulai');
      return false;
    }
    return true;
  }, [form.code, form.discount_value, form.valid_from, form.valid_to]);

  const toCreateInput = (f: PromoFormData): CreatePromoInput => ({
    code: f.code,
    description: f.description || undefined,
    discount_type: f.discount_type,
    discount_value: f.discount_value,
    min_order_amount: f.min_order_amount || undefined,
    max_discount_amount: f.max_discount_amount || undefined,
    usage_limit: f.usage_limit || undefined,
    usage_limit_per_user: f.usage_limit_per_user,
    valid_from: `${f.valid_from}T00:00:00Z`,
    valid_to: `${f.valid_to}T23:59:59Z`,
    is_active: f.is_active,
  });

  const handleSave = useCallback(
    async (initial: PromoCode | null): Promise<void> => {
      if (!validateForm()) return;

      try {
        setIsSaving(true);
        if (initial) {
          await promoAdminService.update(initial.id, {
            description: form.description || undefined,
            discount_value: form.discount_value,
            min_order_amount: form.min_order_amount || undefined,
            max_discount_amount: form.max_discount_amount || undefined,
            usage_limit: form.usage_limit || undefined,
            usage_limit_per_user: form.usage_limit_per_user,
            valid_to: `${form.valid_to}T23:59:59Z`,
            is_active: form.is_active,
          });
          toast.success('Promo diperbarui');
        } else {
          await promoAdminService.create(toCreateInput(form));
          toast.success('Promo berhasil dibuat');
        }
        resetForm();
        onSaved?.();
      } catch (error) {
        handleError(error, { context: 'Failed to save promo code' });
      } finally {
        setIsSaving(false);
      }
    },
    [form, validateForm, resetForm, onSaved]
  );

  return {
    form,
    updateForm,
    isSaving,
    handleSave,
    resetForm,
  };
}
