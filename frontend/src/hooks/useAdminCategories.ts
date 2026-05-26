import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adminCategoryService, type AdminCategoryStats, type AdminCategoryStatusFilter } from '@/services/admin';
import type { Category } from '@/types';
import { handleError } from '@/utils/error-handler';

export interface AdminCategoryFormData {
  name: string;
  description: string;
  parent_id: string;
  image_url: string;
  is_active: boolean;
}

interface UseAdminCategoriesReturn {
  categories: Category[];
  rootCategoryOptions: Category[];
  stats: AdminCategoryStats;
  isLoading: boolean;
  isSaving: boolean;
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  statusFilter: AdminCategoryStatusFilter;
  modalOpen: boolean;
  editingCategory: Category | null;
  pendingDeleteCategory: Category | null;
  formData: AdminCategoryFormData;
  error: string | null;
  openCreate: () => void;
  openEdit: (category: Category) => void;
  closeModal: () => void;
  setStatusFilter: (status: AdminCategoryStatusFilter) => void;
  setPage: (page: number) => void;
  setFormField: <K extends keyof AdminCategoryFormData>(field: K, value: AdminCategoryFormData[K]) => void;
  saveCategory: () => Promise<void>;
  requestDeleteCategory: (category: Category) => void;
  cancelDeleteCategory: () => void;
  confirmDeleteCategory: () => Promise<void>;
  refresh: () => Promise<void>;
}

const emptyForm: AdminCategoryFormData = {
  name: '',
  description: '',
  parent_id: '',
  image_url: '',
  is_active: true,
};

const emptyStats: AdminCategoryStats = {
  total: 0,
  active: 0,
  inactive: 0,
  root: 0,
};

const PAGE_SIZE = 10;

function toFormData(category: Category): AdminCategoryFormData {
  return {
    name: category.name,
    description: category.description ?? '',
    parent_id: category.parent_id ?? '',
    image_url: category.image_url ?? '',
    is_active: category.is_active ?? true,
  };
}

export function useAdminCategories(): UseAdminCategoriesReturn {
  const router = useRouter();
  const [categories, setCategories] = useState<Category[]>([]);
  const [allCategories, setAllCategories] = useState<Category[]>([]);
  const [stats, setStats] = useState<AdminCategoryStats>(emptyStats);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [page, setPageState] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusFilter, setStatusFilterState] = useState<AdminCategoryStatusFilter>('all');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [pendingDeleteCategory, setPendingDeleteCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState<AdminCategoryFormData>(emptyForm);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const [pagedResult, parentResult] = await Promise.all([
        adminCategoryService.listCategories(statusFilter, page, PAGE_SIZE),
        adminCategoryService.listCategories('all', 1, 100),
      ]);
      setCategories(pagedResult.categories);
      setTotal(pagedResult.total);
      setTotalPages(Math.max(1, pagedResult.total_pages));
      setStats(pagedResult.stats);
      setAllCategories(parentResult.categories);
    } catch (err) {
      handleError(err, { context: 'Failed to load categories' });
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const rootCategoryOptions = useMemo(
    () => allCategories.filter((category) => category.id !== editingCategory?.id),
    [allCategories, editingCategory?.id]
  );

  const openCreate = useCallback((): void => {
    setEditingCategory(null);
    setFormData(emptyForm);
    setError(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((category: Category): void => {
    setEditingCategory(category);
    setFormData(toFormData(category));
    setError(null);
    setModalOpen(true);
  }, []);

  const closeModal = useCallback((): void => {
    if (isSaving) return;
    setModalOpen(false);
    setEditingCategory(null);
    setError(null);
  }, [isSaving]);

  const setStatusFilter = useCallback((status: AdminCategoryStatusFilter): void => {
    setStatusFilterState(status);
    setPageState(1);
  }, []);

  const setPage = useCallback((nextPage: number): void => {
    setPageState(Math.max(1, nextPage));
  }, []);

  const setFormField = useCallback(
    <K extends keyof AdminCategoryFormData>(field: K, value: AdminCategoryFormData[K]): void => {
      setFormData((previous) => ({ ...previous, [field]: value }));
      setError(null);
    },
    []
  );

  const saveCategory = useCallback(async (): Promise<void> => {
    const name = formData.name.trim();
    if (name.length < 2) {
      setError('Nama kategori minimal 2 karakter.');
      return;
    }

    try {
      setIsSaving(true);
      if (editingCategory) {
        await adminCategoryService.updateCategory(editingCategory.id, {
          name,
          description: formData.description.trim(),
          parent_id: formData.parent_id || null,
          image_url: formData.image_url.trim(),
          is_active: formData.is_active,
        });
        toast.success('Kategori diperbarui');
      } else {
        await adminCategoryService.createCategory({
          name,
          description: formData.description.trim(),
          parent_id: formData.parent_id || undefined,
          image_url: formData.image_url.trim(),
          is_active: formData.is_active,
        });
        toast.success('Kategori dibuat');
      }
      setModalOpen(false);
      setEditingCategory(null);
      await refresh();
      router.replace('/admin/products/categories');
    } catch (err) {
      handleError(err, { context: 'Failed to save category' });
    } finally {
      setIsSaving(false);
    }
  }, [editingCategory, formData, refresh, router]);

  const requestDeleteCategory = useCallback((category: Category): void => {
    setPendingDeleteCategory(category);
  }, []);

  const cancelDeleteCategory = useCallback((): void => {
    if (isSaving) return;
    setPendingDeleteCategory(null);
  }, [isSaving]);

  const confirmDeleteCategory = useCallback(
    async (): Promise<void> => {
      if (!pendingDeleteCategory) return;
      try {
        setIsSaving(true);
        await adminCategoryService.deleteCategory(pendingDeleteCategory.id);
        toast.success('Kategori dihapus');
        setPendingDeleteCategory(null);
        await refresh();
      } catch (err) {
        handleError(err, { context: 'Failed to delete category' });
      } finally {
        setIsSaving(false);
      }
    },
    [pendingDeleteCategory, refresh]
  );

  return {
    categories,
    rootCategoryOptions,
    stats,
    isLoading,
    isSaving,
    page,
    limit: PAGE_SIZE,
    total,
    totalPages,
    statusFilter,
    modalOpen,
    editingCategory,
    pendingDeleteCategory,
    formData,
    error,
    openCreate,
    openEdit,
    closeModal,
    setStatusFilter,
    setPage,
    setFormField,
    saveCategory,
    requestDeleteCategory,
    cancelDeleteCategory,
    confirmDeleteCategory,
    refresh,
  };
}
