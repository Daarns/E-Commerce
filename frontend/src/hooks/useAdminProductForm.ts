import { useCallback, useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import { toast } from 'sonner';
import type { Category } from '@/types';
import type {
  AdminProduct,
  CreateProductRequest,
  UpdateProductRequest,
} from '@/services/admin';
import { categoryService } from '@/services/product';
import {
  buildCreateProductPayload,
  buildUpdateProductPayload,
  calculateDiscountPercent,
  calculateSalePrice,
  closeCombinationsForOption,
  closeCombinationsForOptions,
  createEmptyProductForm,
  createEmptyVariantOption,
  createEmptyVariantType,
  createVariantCombinationRows,
  createVariantTypeRows,
  generateCombinationSkuFromValues,
  syncCombinationRows,
  validateAdminProductForm,
} from '@/utils/admin-product-form.utils';

export type ProductFormMode = 'create' | 'edit';
export type ProductStatus = NonNullable<CreateProductRequest['status']>;

export interface ProductFormProps {
  mode: ProductFormMode;
  product?: AdminProduct;
  onSubmit: (
    data: CreateProductRequest | UpdateProductRequest
  ) => Promise<void>;
  isLoading?: boolean;
}

export interface VariantOptionRow {
  key: string;
  value: string;
  image_url: string;
}

export interface VariantTypeRow {
  key: string;
  name: string;
  is_visual: boolean;
  options: VariantOptionRow[];
}

export interface VariantCombinationRow {
  key: string;
  option_ids: string[];
  option_values: string[];
  price_adjustment: number;
  stock_quantity: number;
  sku: string;
  is_active: boolean;
}

export type ProductFormErrors = Record<string, string>;
export type VariantTypeField = Exclude<keyof VariantTypeRow, 'key' | 'options'>;
export type VariantOptionField = Exclude<keyof VariantOptionRow, 'key'>;
export type VariantCombinationField = Exclude<keyof VariantCombinationRow, 'key' | 'option_ids' | 'option_values'>;

interface UseAdminProductFormReturn {
  isEdit: boolean;
  formData: CreateProductRequest;
  categories: Category[];
  categoriesLoading: boolean;
  categoryModalOpen: boolean;
  uploadedImages: string[];
  discountPercent: number;
  variantTypes: VariantTypeRow[];
  combinations: VariantCombinationRow[];
  variantsOpen: boolean;
  variantLabelsChanged: boolean;
  errors: ProductFormErrors;
  setCategoryModalOpen: (open: boolean) => void;
  setVariantsOpen: (updater: boolean | ((open: boolean) => boolean)) => void;
  setField: <K extends keyof CreateProductRequest>(field: K, value: CreateProductRequest[K]) => void;
  setDiscountPercent: (value: number) => void;
  addCategory: (category: Category) => void;
  addUploadedImages: (imageUrls: string[]) => void;
  removeUploadedImage: (index: number) => Promise<void>;
  addVariantType: () => void;
  removeVariantType: (key: string) => void;
  closeVariantTypeCombinations: (key: string) => void;
  updateVariantType: <K extends VariantTypeField>(key: string, field: K, value: VariantTypeRow[K]) => void;
  addVariantOption: (typeKey: string) => void;
  removeVariantOption: (typeKey: string, optionKey: string) => void;
  closeVariantOptionCombinations: (optionKey: string) => void;
  updateVariantOption: <K extends VariantOptionField>(
    typeKey: string,
    optionKey: string,
    field: K,
    value: VariantOptionRow[K]
  ) => void;
  removeVariantOptionImage: (typeKey: string, optionKey: string) => Promise<void>;
  updateCombination: <K extends VariantCombinationField>(
    key: string,
    field: K,
    value: VariantCombinationRow[K]
  ) => void;
  regenerateCombinationSku: (key: string) => void;
  regenerateAllCombinationSkus: () => void;
  handleSubmit: (event: FormEvent<HTMLFormElement>) => Promise<void>;
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
  const [discountPercent, setDiscountPercentState] = useState(() => (
    calculateDiscountPercent(
      createEmptyProductForm(product).regular_price,
      createEmptyProductForm(product).sale_price
    )
  ));
  const [variantTypes, setVariantTypes] = useState<VariantTypeRow[]>(() => createVariantTypeRows(product));
  const [combinations, setCombinations] = useState<VariantCombinationRow[]>(() => (
    createVariantCombinationRows(product)
  ));
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [variantLabelsChanged, setVariantLabelsChanged] = useState(false);
  const [errors, setErrors] = useState<ProductFormErrors>({});
  const [stockManuallyEdited, setStockManuallyEdited] = useState<boolean>(() => (
    (product?.stock_quantity ?? 0) > 0
  ));

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

  useEffect(() => {
    if (!isEdit || !product) return;

    setFormData(createEmptyProductForm(product));
    setUploadedImages(product.image_urls ?? []);
    setDiscountPercentState(calculateDiscountPercent(
      createEmptyProductForm(product).regular_price,
      createEmptyProductForm(product).sale_price
    ));
    setVariantTypes(createVariantTypeRows(product));
    setCombinations(createVariantCombinationRows(product));
    setVariantsOpen((product.variant_types ?? []).length > 0);
    setVariantLabelsChanged(false);
    setStockManuallyEdited((product.stock_quantity ?? 0) > 0);
    setErrors({});
  }, [isEdit, product]);

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
      if (field === 'stock_quantity') {
        setStockManuallyEdited(true);
      }
      setFormData((previous) => {
        if (field === 'regular_price' && typeof value === 'number') {
          return {
            ...previous,
            regular_price: value,
            sale_price: calculateSalePrice(value, discountPercent),
          };
        }
        return { ...previous, [field]: value };
      });
      clearError(field);
    },
    [clearError, discountPercent]
  );

  const setDiscountPercent = useCallback((value: number): void => {
    const safeValue = Math.min(100, Math.max(0, value));
    setDiscountPercentState(safeValue);
    setFormData((previous) => ({
      ...previous,
      sale_price: calculateSalePrice(previous.regular_price, safeValue),
      sale_start_date: safeValue > 0 ? previous.sale_start_date : undefined,
      sale_end_date: safeValue > 0 ? previous.sale_end_date : undefined,
    }));
  }, []);

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

  const removeUploadedImage = useCallback(async (index: number): Promise<void> => {
    const imageURL = uploadedImages[index];
    if (!imageURL) return;

    // Deferred delete: remove from frontend state only.
    // - Edit mode: backend syncProductImages() will reconcile on save,
    //   deleting images from DB + storage that are no longer in image_urls.
    // - Create mode: unclaimed temp uploads expire automatically via cleanup job.
    setUploadedImages((previous) => previous.filter((_, currentIndex) => currentIndex !== index));
    toast.success('Image removed');
  }, [uploadedImages]);

  const resyncCombinations = useCallback((nextVariantTypes: VariantTypeRow[]): void => {
    setCombinations((previous) => syncCombinationRows(
      nextVariantTypes,
      previous,
      formData.name
    ));
  }, [formData.name]);

  const addVariantType = useCallback((): void => {
    setVariantTypes((previous) => {
      const next = [...previous, createEmptyVariantType()];
      resyncCombinations(next);
      return next;
    });
    setVariantsOpen(true);
  }, [resyncCombinations]);

  const removeVariantType = useCallback((key: string): void => {
    setVariantTypes((previous) => {
      const next = previous.filter((variantType) => variantType.key !== key);
      resyncCombinations(next);
      return next;
    });
  }, [resyncCombinations]);

  const closeVariantTypeCombinations = useCallback((key: string): void => {
    const variantType = variantTypes.find((candidate) => candidate.key === key);
    if (!variantType) return;

    const optionIds = variantType.options.map((option) => option.key);
    setCombinations((previous) => closeCombinationsForOptions(previous, optionIds));
    toast.success('Kombinasi untuk tipe ini dinonaktifkan');
  }, [variantTypes]);

  const updateVariantType = useCallback(
    <K extends VariantTypeField>(key: string, field: K, value: VariantTypeRow[K]): void => {
      setVariantTypes((previous) => {
        const next = previous.map((variantType) => (
          variantType.key === key ? { ...variantType, [field]: value } : variantType
        ));
        if (field === 'name') {
          setVariantLabelsChanged(true);
        }
        return next;
      });
    },
    []
  );

  const addVariantOption = useCallback((typeKey: string): void => {
    setVariantTypes((previous) => {
      const next = previous.map((variantType) => (
        variantType.key === typeKey
          ? { ...variantType, options: [...variantType.options, createEmptyVariantOption()] }
          : variantType
      ));
      resyncCombinations(next);
      return next;
    });
  }, [resyncCombinations]);

  const removeVariantOption = useCallback((typeKey: string, optionKey: string): void => {
    setVariantTypes((previous) => {
      const next = previous.map((variantType) => (
        variantType.key === typeKey
          ? {
              ...variantType,
              options: variantType.options.filter((option) => option.key !== optionKey),
            }
          : variantType
      ));
      resyncCombinations(next);
      return next;
    });
  }, [resyncCombinations]);

  const closeVariantOptionCombinations = useCallback((optionKey: string): void => {
    setCombinations((previous) => closeCombinationsForOption(previous, optionKey));
    toast.success('Kombinasi untuk pilihan ini dinonaktifkan');
  }, []);

  const updateVariantOption = useCallback(
    <K extends VariantOptionField>(typeKey: string, optionKey: string, field: K, value: VariantOptionRow[K]): void => {
      setVariantTypes((previous) => {
        const next = previous.map((variantType) => (
          variantType.key === typeKey
            ? {
                ...variantType,
                options: variantType.options.map((option) => (
                  option.key === optionKey ? { ...option, [field]: value } : option
                )),
              }
            : variantType
        ));
        if (field === 'value') {
          setVariantLabelsChanged(true);
          setCombinations((previousCombinations) => syncCombinationRows(
            next,
            previousCombinations,
            formData.name
          ));
        }
        return next;
      });
    },
    [formData.name]
  );

  const removeVariantOptionImage = useCallback(
    async (typeKey: string, optionKey: string): Promise<void> => {
      // Deferred delete: clear URL from state only.
      // Backend deleteUnusedImageObjects() handles cleanup on save.
      updateVariantOption(typeKey, optionKey, 'image_url', '');
      toast.success('Variant image removed');
    },
    [updateVariantOption]
  );

  const updateCombination = useCallback(
    <K extends VariantCombinationField>(key: string, field: K, value: VariantCombinationRow[K]): void => {
      setCombinations((previous) => {
        const next = previous.map((combination) => (
          combination.key === key ? { ...combination, [field]: value } : combination
        ));
        const nextTotalStock = next
          .filter((combination) => combination.is_active)
          .reduce((total, combination) => total + combination.stock_quantity, 0);

        if (!stockManuallyEdited || formData.stock_quantity === 0) {
          setFormData((current) => ({
            ...current,
            stock_quantity: nextTotalStock,
          }));
          setStockManuallyEdited(false);
          clearError('stock_quantity');
          clearError('variant_combinations');
        }

        return next;
      });
    },
    [clearError, formData.stock_quantity, stockManuallyEdited]
  );

  const regenerateCombinationSku = useCallback((key: string): void => {
    setCombinations((previous) => previous.map((combination) => (
      combination.key === key
        ? {
            ...combination,
            sku: generateCombinationSkuFromValues(formData.name, combination.option_values),
          }
        : combination
    )));
  }, [formData.name]);

  const regenerateAllCombinationSkus = useCallback((): void => {
    setCombinations((previous) => previous.map((combination) => ({
      ...combination,
      sku: generateCombinationSkuFromValues(formData.name, combination.option_values),
    })));
    setVariantLabelsChanged(false);
  }, [formData.name]);

  const handleSubmit = useCallback(
    async (event: FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      const validationErrors = validateAdminProductForm({
        formData,
        uploadedImages,
        variantTypes,
        combinations,
        isEdit,
      });
      setErrors(validationErrors);

      if (Object.keys(validationErrors).length > 0) {
        toast.error('Cek Kelengkapan Form');
        return;
      }

      try {
        if (isEdit && product) {
          const payload: UpdateProductRequest = buildUpdateProductPayload(
            product,
            formData,
            uploadedImages,
            variantTypes,
            combinations
          );
          await onSubmit(payload);
          return;
        }

        const payload = buildCreateProductPayload(formData, uploadedImages, variantTypes, combinations);
        await onSubmit(payload);
      } catch {
        // Parent submit handlers own user-facing submit errors.
      }
    },
    [formData, uploadedImages, variantTypes, combinations, isEdit, product, onSubmit]
  );

  return {
    isEdit,
    formData,
    categories,
    categoriesLoading,
    categoryModalOpen,
    uploadedImages,
    discountPercent,
    variantTypes,
    combinations,
    variantsOpen,
    variantLabelsChanged,
    errors,
    setCategoryModalOpen,
    setVariantsOpen,
    setField,
    setDiscountPercent,
    addCategory,
    addUploadedImages,
    removeUploadedImage,
    addVariantType,
    removeVariantType,
    closeVariantTypeCombinations,
    updateVariantType,
    addVariantOption,
    removeVariantOption,
    closeVariantOptionCombinations,
    updateVariantOption,
    removeVariantOptionImage,
    updateCombination,
    regenerateCombinationSku,
    regenerateAllCombinationSkus,
    handleSubmit,
  };
}
