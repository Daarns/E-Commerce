import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { adminCategoryService } from '@/services/admin';
import type { Category } from '@/types';
import { handleError } from '@/utils/error-handler';

interface UseAdminCategoryCreateReturn {
  name: string;
  saving: boolean;
  setName: (value: string) => void;
  createCategory: () => Promise<Category | null>;
  reset: () => void;
}

export function useAdminCategoryCreate(): UseAdminCategoryCreateReturn {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const reset = useCallback((): void => {
    setName('');
  }, []);

  const createCategory = useCallback(async (): Promise<Category | null> => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      toast.error('Nama kategori wajib diisi');
      return null;
    }

    try {
      setSaving(true);
      const category = await adminCategoryService.createCategory({
        name: trimmedName,
        is_active: true,
      });
      toast.success(`Kategori "${category.name}" berhasil dibuat`);
      reset();
      return category;
    } catch (error) {
      handleError(error, {
        context: 'Gagal membuat kategori',
      });
      return null;
    } finally {
      setSaving(false);
    }
  }, [name, reset]);

  return {
    name,
    saving,
    setName,
    createCategory,
    reset,
  };
}
