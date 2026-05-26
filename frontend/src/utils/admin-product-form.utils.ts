import type {
  AdminProduct,
  AdminVariantCombinationInput,
  AdminVariantImageInput,
  AdminVariantTypeInput,
  CreateProductRequest,
  UpdateProductRequest,
} from '@/services/admin';
import type {
  ProductFormErrors,
  ProductStatus,
  VariantCombinationRow,
  VariantOptionRow,
  VariantTypeRow,
} from '@/hooks/useAdminProductForm';

export function createEmptyProductForm(product?: AdminProduct): CreateProductRequest {
  return {
    name: product?.name ?? '',
    description: product?.description ?? '',
    short_description: product?.short_description ?? '',
    regular_price: parseNumber(product?.regular_price ?? product?.price, 0),
    sale_price: product?.sale_price === undefined ? undefined : parseNumber(product.sale_price, 0),
    sale_start_date: product?.sale_start_date ? toDateTimeLocal(product.sale_start_date) : undefined,
    sale_end_date: product?.sale_end_date ? toDateTimeLocal(product.sale_end_date) : undefined,
    stock_quantity: product?.stock_quantity ?? 0,
    category_id: product?.category_id ?? product?.category?.id,
    brand: product?.brand ?? '',
    sku: product?.sku ?? '',
    status: normalizeProductStatus(product?.status),
    meta_title: product?.meta_title ?? '',
    meta_description: product?.meta_description ?? '',
  };
}

export function createEmptyVariantType(): VariantTypeRow {
  return {
    key: crypto.randomUUID(),
    name: '',
    is_visual: false,
    options: [createEmptyVariantOption()],
  };
}

export function createEmptyVariantOption(value: string = ''): VariantOptionRow {
  return {
    key: crypto.randomUUID(),
    value,
    image_url: '',
  };
}

export function createVariantTypeRows(product?: AdminProduct): VariantTypeRow[] {
  const images = product?.images ?? [];

  return (product?.variant_types ?? []).map((variantType) => ({
    key: variantType.id,
    name: variantType.name,
    is_visual: variantType.is_visual,
    options: variantType.options.map((option) => ({
      key: option.id,
      value: option.value,
      image_url: images.find((image) => image.option_id === option.id)?.image_url ??
        images.find((image) => image.option_id === option.id)?.url ??
        '',
    })),
  }));
}

export function createVariantCombinationRows(product?: AdminProduct): VariantCombinationRow[] {
  if (product?.combinations?.length && product.variant_types?.length) {
    const optionValueById = new Map<string, string>();
    product.variant_types.forEach((variantType) => {
      variantType.options.forEach((option) => {
        optionValueById.set(option.id, option.value);
      });
    });

    return product.combinations.map((combination) => {
      const optionIds = combination.option_ids ?? combination.options?.map((option) => option.id) ?? [];
      return {
        key: combination.id,
        option_ids: optionIds,
        option_values: optionIds
          .map((optionId) => optionValueById.get(optionId))
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0),
        price_adjustment: parseNumber(combination.price_adjustment, 0),
        stock_quantity: combination.stock_quantity,
        sku: combination.sku ?? '',
        is_active: combination.is_active,
      };
    });
  }

  return [];
}

export function validateAdminProductForm(params: {
  formData: CreateProductRequest;
  uploadedImages: string[];
  variantTypes: VariantTypeRow[];
  combinations: VariantCombinationRow[];
  isEdit: boolean;
}): ProductFormErrors {
  const { formData, uploadedImages, variantTypes, combinations, isEdit } = params;
  const errors: ProductFormErrors = {};

  if (!formData.name.trim()) {
    errors.name = 'Nama produk wajib diisi.';
  } else if (formData.name.trim().length < 2) {
    errors.name = 'Nama produk minimal 2 karakter.';
  }

  if (formData.regular_price <= 0) errors.regular_price = 'Harga normal wajib lebih dari Rp 0.';
  if (formData.stock_quantity < 0) errors.stock_quantity = 'Stok tidak boleh negatif.';
  if (uploadedImages.length === 0 && !isEdit) errors.images = 'Tambahkan minimal 1 gambar produk.';

  const activeVariantTypes = getActiveVariantTypes(variantTypes);
  activeVariantTypes.forEach((variantType, typeIndex) => {
    if (!variantType.name.trim()) errors[`variant_type_${typeIndex}`] = 'Nama tipe varian wajib diisi.';
    const optionValues = variantType.options
      .map((option) => option.value.trim())
      .filter(Boolean);
    if (optionValues.length === 0) errors[`variant_options_${typeIndex}`] = 'Tambahkan minimal 1 opsi untuk tipe ini.';
    if (new Set(optionValues.map((value) => value.toLowerCase())).size !== optionValues.length) {
      errors[`variant_options_${typeIndex}`] = 'Ada opsi duplikat pada tipe ini.';
    }
  });

  const allOptionValues = activeVariantTypes.flatMap((variantType) => getOptionValues(variantType));
  if (new Set(allOptionValues.map((value) => value.toLowerCase())).size !== allOptionValues.length) {
    errors.variant_combinations = 'Nilai opsi tidak boleh sama antar tipe varian.';
  }

  if (activeVariantTypes.length > 0 && combinations.length === 0) {
    errors.variant_combinations = 'Tambahkan minimal 1 kombinasi varian.';
  }

  const activeCombinationStock = combinations
    .filter((combination) => combination.is_active)
    .reduce((total, combination) => total + combination.stock_quantity, 0);
  if (activeCombinationStock > 0 && formData.stock_quantity > 0 && activeCombinationStock > formData.stock_quantity) {
    errors.variant_combinations = `Total stok varian (${activeCombinationStock}) tidak boleh melebihi stok produk (${formData.stock_quantity}).`;
  }

  combinations.forEach((combination, index) => {
    if (combination.is_active && combination.stock_quantity < 0) {
      errors[`combination_stock_${index}`] = 'Stok kombinasi tidak boleh negatif.';
    }
  });

  return errors;
}

export function buildUpdateProductPayload(
  product: AdminProduct,
  formData: CreateProductRequest,
  uploadedImages: string[],
  variantTypes: VariantTypeRow[],
  combinations: VariantCombinationRow[]
): UpdateProductRequest {
  return {
    id: product.id,
    version: product.version ?? 1,
    name: formData.name,
    description: formData.description,
    short_description: formData.short_description,
    regular_price: formData.regular_price,
    sale_price: formData.sale_price,
    sale_start_date: formData.sale_start_date,
    sale_end_date: formData.sale_end_date,
    stock_quantity: formData.stock_quantity,
    category_id: formData.category_id,
    brand: formData.brand,
    sku: formData.sku,
    status: formData.status,
    meta_title: formData.meta_title,
    meta_description: formData.meta_description,
    image_urls: uploadedImages,
    variant_types: toVariantTypeInputs(variantTypes),
    combinations: toVariantCombinationInputs(combinations),
    variant_images: toVariantImageInputs(variantTypes),
  };
}

export function buildCreateProductPayload(
  formData: CreateProductRequest,
  uploadedImages: string[],
  variantTypes: VariantTypeRow[],
  combinations: VariantCombinationRow[]
): CreateProductRequest {
  return {
    ...formData,
    image_urls: uploadedImages,
    variant_types: toVariantTypeInputs(variantTypes),
    combinations: toVariantCombinationInputs(combinations),
    variant_images: toVariantImageInputs(variantTypes),
  };
}

export function toVariantTypeInputs(variantTypes: VariantTypeRow[]): AdminVariantTypeInput[] {
  return getActiveVariantTypes(variantTypes).map((variantType, index) => ({
    id: variantType.key,
    name: variantType.name.trim(),
    is_visual: variantType.is_visual,
    display_order: index,
    options: variantType.options
      .map((option) => ({
        id: option.key,
        value: option.value.trim(),
      }))
      .filter((option) => option.value.length > 0),
  }));
}

export function toVariantCombinationInputs(combinations: VariantCombinationRow[]): AdminVariantCombinationInput[] {
  return combinations
    .filter((combination) => combination.option_ids.length > 0)
    .map((combination) => ({
      id: combination.key,
      option_ids: combination.option_ids,
      option_values: combination.option_values,
      price_adjustment: combination.price_adjustment,
      stock_quantity: combination.stock_quantity,
      sku: combination.sku,
      is_active: combination.is_active,
    }));
}

export function toVariantImageInputs(variantTypes: VariantTypeRow[]): AdminVariantImageInput[] {
  return getActiveVariantTypes(variantTypes)
    .flatMap((variantType) => variantType.options)
    .filter((option) => option.value.trim() && option.image_url.trim())
    .map((option) => ({
      option_id: option.key,
      option_value: option.value.trim(),
      image_url: option.image_url.trim(),
    }));
}

export function syncCombinationRows(
  variantTypes: VariantTypeRow[],
  previousCombinations: VariantCombinationRow[],
  productName: string
): VariantCombinationRow[] {
  const optionSets = getActiveVariantTypes(variantTypes).map((variantType) => getOptionsForCombination(variantType));
  if (optionSets.length === 0 || optionSets.some((options) => options.length === 0)) return [];

  const previousByOptionIDs = new Map(
    previousCombinations.map((combination) => [optionIDKey(combination.option_ids), combination])
  );
  const nextRows = cartesianProduct(optionSets).map((optionValues) => {
    const optionIds = optionValues.map((option) => option.id);
    const values = optionValues.map((option) => option.value);
    return { optionIds, values, optionValues };
  });

  const templateUsage = new Map<string, number>();
  nextRows.forEach(({ optionIds }) => {
    if (previousByOptionIDs.has(optionIDKey(optionIds))) return;

    const template = findBestCombinationTemplate(previousCombinations, optionIds);
    if (!template) return;

    templateUsage.set(template.key, (templateUsage.get(template.key) ?? 0) + 1);
  });

  return nextRows.map(({ optionIds, values, optionValues }) => {
    const existing = previousByOptionIDs.get(optionIDKey(optionIds));
    if (existing) {
      return {
        ...existing,
        option_ids: optionIds,
        option_values: values,
      };
    }

    const template = findBestCombinationTemplate(previousCombinations, optionIds);
    if (template) {
      const usedOnce = (templateUsage.get(template.key) ?? 0) === 1;

      return {
        key: usedOnce ? template.key : crypto.randomUUID(),
        option_ids: optionIds,
        option_values: values,
        price_adjustment: template.price_adjustment,
        stock_quantity: usedOnce ? template.stock_quantity : 0,
        sku: generateCombinationSku(productName, optionValues),
        is_active: usedOnce ? template.is_active : false,
      };
    }

    return {
      key: crypto.randomUUID(),
      option_ids: optionIds,
      option_values: values,
      price_adjustment: 0,
      stock_quantity: 0,
      sku: generateCombinationSku(productName, optionValues),
      is_active: false,
    };
  });
}

export function closeCombinationsForOption(
  combinations: VariantCombinationRow[],
  optionId: string
): VariantCombinationRow[] {
  return combinations.map((combination) => {
    if (!combination.option_ids.includes(optionId)) return combination;

    return {
      ...combination,
      is_active: false,
    };
  });
}

export function closeCombinationsForOptions(
  combinations: VariantCombinationRow[],
  optionIds: string[]
): VariantCombinationRow[] {
  const optionIDSet = new Set(optionIds);
  return combinations.map((combination) => {
    if (!combination.option_ids.some((optionId) => optionIDSet.has(optionId))) return combination;

    return {
      ...combination,
      is_active: false,
    };
  });
}

export function parseNumber(value: string | number | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function parseFormattedNumber(value: string): number {
  const normalized = value.replace(/\./g, '').replace(/[^\d-]/g, '');
  if (normalized === '' || normalized === '-') return 0;
  const parsed = Number.parseInt(normalized, 10);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatThousands(value: string | number | undefined): string {
  const numericValue = typeof value === 'string' ? parseFormattedNumber(value) : value ?? 0;
  if (!Number.isFinite(numericValue) || numericValue === 0) return '';
  return Math.trunc(numericValue).toLocaleString('id-ID');
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

export function calculateDiscountPercent(regularPrice: number, salePrice: number | undefined): number {
  if (!salePrice || regularPrice <= 0 || salePrice >= regularPrice) return 0;
  return Math.round((1 - salePrice / regularPrice) * 100);
}

export function calculateSalePrice(regularPrice: number, discountPercent: number): number | undefined {
  if (regularPrice <= 0 || discountPercent <= 0) return 0;
  const safePercent = Math.min(100, Math.max(0, discountPercent));
  return Math.round(regularPrice * (1 - safePercent / 100));
}

function toDateTimeLocal(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

function getActiveVariantTypes(variantTypes: VariantTypeRow[]): VariantTypeRow[] {
  return variantTypes.filter((variantType) => (
    variantType.name.trim().length > 0 ||
    variantType.options.some((option) => option.value.trim().length > 0)
  ));
}

function getOptionValues(variantType: VariantTypeRow): string[] {
  return variantType.options
    .map((option) => option.value.trim())
    .filter((value) => value.length > 0);
}

interface CombinationOptionRef {
  id: string;
  value: string;
}

function getOptionsForCombination(variantType: VariantTypeRow): CombinationOptionRef[] {
  return variantType.options
    .map((option) => ({
      id: option.key,
      value: option.value.trim(),
    }))
    .filter((option) => option.value.length > 0);
}

function cartesianProduct(optionSets: CombinationOptionRef[][]): CombinationOptionRef[][] {
  return optionSets.reduce<CombinationOptionRef[][]>(
    (combinations, options) => combinations.flatMap((combination) => (
      options.map((option) => [...combination, option])
    )),
    [[]]
  );
}

function findBestCombinationTemplate(
  combinations: VariantCombinationRow[],
  nextOptionIds: string[]
): VariantCombinationRow | undefined {
  const nextIDSet = new Set(nextOptionIds);

  return combinations
    .filter((combination) => (
      combination.option_ids.length > 0 &&
      combination.option_ids.every((optionId) => nextIDSet.has(optionId))
    ))
    .sort((left, right) => right.option_ids.length - left.option_ids.length)[0];
}

function optionIDKey(optionIds: string[]): string {
  return optionIds.map((optionId) => optionId.trim().toLowerCase()).sort().join('\u001f');
}

export function generateCombinationSkuFromValues(
  productName: string,
  optionValues: string[]
): string {
  return generateCombinationSku(
    productName,
    optionValues.map((value) => ({ id: value, value }))
  );
}

function generateCombinationSku(productName: string, options: CombinationOptionRef[]): string {
  const base = (productName.trim() || 'PRODUCT')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toUpperCase();
  const suffix = options
    .map((option) => option.value.replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').toUpperCase())
    .filter(Boolean)
    .join('-');
  return [base, suffix].filter(Boolean).join('-').slice(0, 100);
}
