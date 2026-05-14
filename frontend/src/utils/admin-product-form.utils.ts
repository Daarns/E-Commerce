import type {
  AdminProduct,
  CreateProductRequest,
  CreateVariantInput,
  UpdateProductRequest,
} from '@/services/admin';
import type { ProductFormErrors, ProductStatus, VariantRow } from '@/hooks/useAdminProductForm';

export function createEmptyProductForm(product?: AdminProduct): CreateProductRequest {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    short_description: product?.short_description ?? '',
    regular_price: parseNumber(product?.regular_price ?? product?.price, 0),
    sale_price: product?.sale_price === undefined ? undefined : parseNumber(product.sale_price, 0),
    stock_quantity: product?.stock_quantity ?? 0,
    category_id: product?.category_id ?? product?.category?.id,
    brand: product?.brand ?? '',
    sku: product?.sku ?? '',
    status: normalizeProductStatus(product?.status),
    meta_title: product?.meta_title ?? '',
    meta_description: product?.meta_description ?? '',
  };
}

export function createEmptyVariant(): VariantRow {
  return {
    key: crypto.randomUUID(),
    variant_type: '',
    variant_value: '',
    price_adjustment: 0,
    stock_quantity: 0,
    sku_suffix: '',
    is_active: true,
  };
}

export function validateAdminProductForm(params: {
  formData: CreateProductRequest;
  uploadedImages: string[];
  variants: VariantRow[];
  isEdit: boolean;
}): ProductFormErrors {
  const { formData, uploadedImages, variants, isEdit } = params;
  const errors: ProductFormErrors = {};

  if (!formData.name.trim()) {
    errors.name = 'Required';
  } else if (formData.name.trim().length < 2) {
    errors.name = 'Min 2 karakter';
  }

  if (formData.regular_price <= 0) errors.regular_price = 'Harus > 0';
  if (formData.stock_quantity < 0) errors.stock_quantity = 'Tidak boleh negatif';
  if (uploadedImages.length === 0 && !isEdit) errors.images = 'Minimal 1 gambar';

  variants.forEach((variant, index) => {
    if (!variant.variant_type.trim()) errors[`v_type_${index}`] = 'Required';
    if (!variant.variant_value.trim()) errors[`v_val_${index}`] = 'Required';
  });

  return errors;
}

export function buildUpdateProductPayload(
  product: AdminProduct,
  formData: CreateProductRequest
): UpdateProductRequest {
  return {
    id: product.id,
    version: product.version ?? 1,
    name: formData.name,
    description: formData.description,
    short_description: formData.short_description,
    regular_price: formData.regular_price,
    sale_price: formData.sale_price,
    stock_quantity: formData.stock_quantity,
    category_id: formData.category_id,
    brand: formData.brand,
    sku: formData.sku,
    status: formData.status,
    meta_title: formData.meta_title,
    meta_description: formData.meta_description,
  };
}

export function buildCreateProductPayload(
  formData: CreateProductRequest,
  uploadedImages: string[]
): CreateProductRequest {
  return { ...formData, image_urls: uploadedImages };
}

export function toCreateVariantInputs(variants: VariantRow[]): CreateVariantInput[] {
  return variants.map((variant) => ({
    variant_type: variant.variant_type,
    variant_value: variant.variant_value,
    price_adjustment: variant.price_adjustment,
    stock_quantity: variant.stock_quantity,
    sku_suffix: variant.sku_suffix,
    image_url: variant.image_url,
    is_active: variant.is_active,
  }));
}

export function parseNumber(value: string | number | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function normalizeProductStatus(status: string | undefined): ProductStatus {
  switch (status) {
    case 'active':
    case 'draft':
    case 'archived':
      return status;
    default:
      return 'active';
  }
}
