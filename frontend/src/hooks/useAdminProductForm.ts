import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import type { Category } from '@/types';
import type {
  AdminProduct,
  CreateProductRequest,
  CreateVariantInput,
  UpdateProductRequest,
} from '@/services/admin';
import { categoryService } from '@/services/product';
import {
  buildCreateProductPayload,
  buildUpdateProductPayload,
  createEmptyProductForm,
  createEmptyVariant,
  toCreateVariantInputs,
  validateAdminProductForm,
} from '@/utils/admin-product-form.utils';

export type ProductFormMode = 'create' | 'edit';
export type ProductStatus = NonNullable<CreateProductRequest['status']>;

export interface ProductFormProps {
  mode: ProductFormMode;
  product?: AdminProduct;
  onSubmit: (
    data: CreateProductRequest | UpdateProductRequest,
    variants?: CreateVariantInput[]
  ) => Promise<void>;
  isLoading?: boolean;
}

export interface VariantRow extends Omit<CreateVariantInput, 'is_active'> {
  key: string;
  is_active: boolean;
}

export type ProductFormErrors = Record<string, string>;
export type VariantRowField = Exclude<keyof VariantRow, 'key'>;

interface UseAdminProductFormReturn {
  isEdit: boolean;
  formData: CreateProductRequest;
  categories: Category[];
  categoriesLoading: boolean;
  categoryModalOpen: boolean;
  uploadedImages: string[];
  variants: VariantRow[];
  variantsOpen: boolean;
  errors: ProductFormErrors;
  setCategoryModalOpen: (open: boolean) => void;
  setVariantsOpen: (updater: boolean | ((open: boolean) => boolean)) => void;
  setField: <K extends keyof CreateProductRequest>(field: K, value: CreateProductRequest[K]) => void;
  addCategory: (category: Category) => void;
  addUploadedImages: (imageUrls: string[]) => void;
  removeUploadedImage: (index: number) => void;
  addVariant: () => void;
  removeVariant: (key: string) => void;
  updateVariant: <K extends VariantRowField>(key: string, field: K, value: VariantRow[K]) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useAdminProductForm({
  mode,
  product,
  onSubmit,
}: ProductFormProps): UseAdminProductFormReturn {
  const isEdit = mode === 'edit';
  const [formData, setFormData] = useState<CreateProductRequest>(() => createEmptyProductForm(product));
  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>(() => product?.image_urls ?? []);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [errors, setErrors] = useState<ProductFormErrors>({});

  const loadCategories = useCallback(async (): Promise<void> => {
    try {
      setCategoriesLoading(true);
      const flatCategories = await categoryService.getCategories();
      const nextCategories =
        flatCategories.length > 0 ? flatCategories : await categoryService.getCategoryTree();
      setCategories(nextCategories);
    } catch {
      toast.error('Gagal memuat kategori');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  const clearError = useCallback((field: string): void => {
    setErrors((previous) => {
      if (!previous[field]) return previous;
      const next = { ...previous };
      delete next[field];
      return next;
    });
  }, []);

  const setField = useCallback(
    <K extends keyof CreateProductRequest>(field: K, value: CreateProductRequest[K]): void => {
      setFormData((previous) => ({ ...previous, [field]: value }));
      clearError(field);
    },
    [clearError]
  );

  const addCategory = useCallback(
    (category: Category): void => {
      setCategories((previous) => [...previous, category]);
      setField('category_id', category.id);
    },
    [setField]
  );

  const addUploadedImages = useCallback(
    (imageUrls: string[]): void => {
      setUploadedImages((previous) => [...previous, ...imageUrls]);
      clearError('images');
    },
    [clearError]
  );

  const removeUploadedImage = useCallback((index: number): void => {
    setUploadedImages((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
  }, []);

  const addVariant = useCallback((): void => {
    setVariants((previous) => [...previous, createEmptyVariant()]);
  }, []);

  const removeVariant = useCallback((key: string): void => {
    setVariants((previous) => previous.filter((variant) => variant.key !== key));
  }, []);

  const updateVariant = useCallback(
    <K extends VariantRowField>(key: string, field: K, value: VariantRow[K]): void => {
      setVariants((previous) =>
        previous.map((variant) => (variant.key === key ? { ...variant, [field]: value } : variant))
      );
    },
    []
  );

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      const validationErrors = validateAdminProductForm({
        formData,
        uploadedImages,
        variants,
        isEdit,
      });
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        toast.error('Perbaiki error pada form');
        return;
      }

      try {
        if (isEdit && product) {
          const payload: UpdateProductRequest = buildUpdateProductPayload(product, formData);
          await onSubmit(payload);
          return;
        }

        const payload = buildCreateProductPayload(formData, uploadedImages);
        const variantsToSubmit: CreateVariantInput[] = toCreateVariantInputs(variants);
        await onSubmit(payload, variantsToSubmit);
      } catch {
        // Parent submit handlers own user-facing submit errors.
      }
    },
    [formData, uploadedImages, variants, isEdit, product, onSubmit]
  );

  return {
    isEdit,
    formData,
    categories,
    categoriesLoading,
    categoryModalOpen,
    uploadedImages,
    variants,
    variantsOpen,
    errors,
    setCategoryModalOpen,
    setVariantsOpen,
    setField,
    addCategory,
    addUploadedImages,
    removeUploadedImage,
    addVariant,
    removeVariant,
    updateVariant,
    handleSubmit,
  };
}
