import { toNum } from '@/utils/format';
import type {
  Product,
  ProductImage,
  ProductVariantCombination,
} from '@/types';

export interface ProductPricing {
  regularPrice: number;
  salePrice: number | undefined;
  currentPrice: number;
  originalPrice: number;
  priceAdjustment: number;
  hasDiscount: boolean;
  discountPercentage: number;
}

export interface ProductPriceRange {
  currentMin: number;
  currentMax: number;
  originalMin: number;
  originalMax: number;
  hasRange: boolean;
  hasDiscount: boolean;
  discountPercentage: number;
}

export interface ProductCardPricing {
  currentMin: number;
  currentMax: number;
  originalPrice: number;
  hasRange: boolean;
  hasDiscount: boolean;
  discountPercentage: number;
}

export interface ProductCardImages {
  primary: ProductImage | undefined;
  hover: ProductImage | undefined;
}

export interface ProductGalleryImage {
  image: ProductImage;
  originalIndex: number;
}

export function calculateDiscountPercentage(
  regularPrice: string | number | undefined | null,
  salePrice: string | number | undefined | null
): number {
  const regular = toNum(regularPrice);
  const sale = toNum(salePrice);

  if (regular <= 0 || sale <= 0 || sale >= regular) {
    return 0;
  }

  return Math.round((1 - sale / regular) * 100);
}

function getEffectivePriceValue(product: Product, regularPrice: number): number {
  const effectivePrice = toNum(product.effective_price);
  if (effectivePrice > 0) return effectivePrice;

  const salePrice = toNum(product.sale_price);
  if (salePrice > 0) return salePrice;

  return regularPrice;
}

export function getProductPricing(
  product: Product,
  variant?: ProductVariantCombination | null
): ProductPricing {
  const regularPrice = toNum(product.regular_price);
  const effectivePrice = getEffectivePriceValue(product, regularPrice);
  const salePrice = effectivePrice < regularPrice ? effectivePrice : undefined;
  const basePrice = salePrice ?? regularPrice;
  const priceAdjustment = toNum(variant?.price_adjustment);

  return {
    regularPrice,
    salePrice,
    currentPrice: basePrice + priceAdjustment,
    originalPrice: regularPrice + priceAdjustment,
    priceAdjustment,
    hasDiscount: salePrice !== undefined,
    discountPercentage: calculateDiscountPercentage(regularPrice, salePrice),
  };
}

export function getProductImageUrl(image: ProductImage | undefined): string | undefined {
  return image?.url ?? image?.image_url;
}

export function getUniqueProductImages(images: ProductImage[] | undefined): ProductImage[] {
  const seenUrls = new Set<string>();
  const uniqueImages: ProductImage[] = [];

  (images ?? []).forEach((image) => {
    const imageUrl = getProductImageUrl(image);
    if (!imageUrl || seenUrls.has(imageUrl)) return;

    seenUrls.add(imageUrl);
    uniqueImages.push(image);
  });

  return uniqueImages;
}

export function getProductGalleryImages(images: ProductImage[]): ProductGalleryImage[] {
  const seenUrls = new Set<string>();
  const galleryImages: ProductGalleryImage[] = [];

  images.forEach((image, originalIndex) => {
    const imageUrl = getProductImageUrl(image);
    if (!imageUrl || seenUrls.has(imageUrl)) return;

    seenUrls.add(imageUrl);
    galleryImages.push({ image, originalIndex });
  });

  return galleryImages;
}

export function getProductImageForCombination(
  images: ProductImage[] | undefined,
  combination?: ProductVariantCombination
): ProductImage | undefined {
  const optionIds = combination ? getCombinationOptionIds(combination) : [];
  const variantImage = optionIds.length > 0
    ? images?.find((image) => image.option_id && optionIds.includes(image.option_id))
    : undefined;

  return variantImage
    ?? images?.find((image) => !image.option_id)
    ?? images?.[0];
}

export function getProductCardImages(images: ProductImage[] | undefined): ProductCardImages {
  const uniqueImages = getUniqueProductImages(images);
  const defaultImages = uniqueImages.filter((image) => !image.option_id);
  const variantImages = uniqueImages.filter((image) => Boolean(image.option_id));
  const candidates = defaultImages.length > 0 ? defaultImages : variantImages;

  return {
    primary: candidates[0],
    hover: candidates[1],
  };
}

export function getCombinationOptionIds(combination: ProductVariantCombination): string[] {
  return combination.option_ids ?? combination.options?.map((option) => option.id) ?? [];
}

export function findMatchingCombination(
  combinations: ProductVariantCombination[] | undefined,
  selectedOptions: Record<string, string>,
  requiredOptionCount: number
): ProductVariantCombination | null {
  if (!combinations?.length || requiredOptionCount === 0) return null;

  const selectedOptionIds = Object.values(selectedOptions).filter(Boolean);
  if (selectedOptionIds.length < requiredOptionCount) return null;

  return combinations.find((combination) => {
    const optionIds = getCombinationOptionIds(combination);
    return combination.is_active && selectedOptionIds.every((optionId) => optionIds.includes(optionId));
  }) ?? null;
}

export function getAvailableOptionIdsForType(
  typeId: string,
  selectedOptions: Record<string, string>,
  combinations: ProductVariantCombination[] | undefined
): Set<string> {
  const available = new Set<string>();
  if (!combinations?.length) return available;

  const otherSelectedIds = Object.entries(selectedOptions)
    .filter(([selectedTypeId, optionId]) => selectedTypeId !== typeId && Boolean(optionId))
    .map(([, optionId]) => optionId);

  combinations.forEach((combination) => {
    if (!combination.is_active || combination.stock_quantity <= 0) return;

    const optionIds = getCombinationOptionIds(combination);
    if (otherSelectedIds.every((optionId) => optionIds.includes(optionId))) {
      optionIds.forEach((optionId) => available.add(optionId));
    }
  });

  return available;
}

export function buildSelectedOptionsFromCombination(
  product: Product,
  combination: ProductVariantCombination
): Record<string, string> {
  const selected: Record<string, string> = {};
  const optionIds = getCombinationOptionIds(combination);

  product.variant_types?.forEach((variantType) => {
    const option = variantType.options.find((candidate) => optionIds.includes(candidate.id));
    if (option) {
      selected[variantType.id] = option.id;
    }
  });

  return selected;
}

export function getProductPriceRange(product: Product): ProductPriceRange {
  const regularPrice = toNum(product.regular_price);
  const effectivePrice = getEffectivePriceValue(product, regularPrice);

  const activeAdjustments = (product.combinations ?? [])
    .filter((combination) => combination.is_active)
    .map((combination) => toNum(combination.price_adjustment));

  const adjustments = activeAdjustments.length > 0 ? activeAdjustments : [0];
  const minAdjustment = Math.min(...adjustments);
  const maxAdjustment = Math.max(...adjustments);
  const currentMin = effectivePrice + minAdjustment;
  const currentMax = effectivePrice + maxAdjustment;
  const originalMin = regularPrice + minAdjustment;
  const originalMax = regularPrice + maxAdjustment;

  return {
    currentMin,
    currentMax,
    originalMin,
    originalMax,
    hasRange: currentMin !== currentMax,
    hasDiscount: effectivePrice > 0 && effectivePrice < regularPrice,
    discountPercentage: calculateDiscountPercentage(regularPrice, effectivePrice),
  };
}

export function getProductCardPricing(product: Product): ProductCardPricing {
  const regularPrice = toNum(product.regular_price);
  const effectivePrice = getEffectivePriceValue(product, regularPrice);
  const hasDiscount = effectivePrice > 0 && effectivePrice < regularPrice;
  const displayPrice = hasDiscount ? effectivePrice : regularPrice;

  return {
    currentMin: displayPrice,
    currentMax: displayPrice,
    originalPrice: regularPrice,
    hasRange: false,
    hasDiscount,
    discountPercentage: hasDiscount ? calculateDiscountPercentage(regularPrice, effectivePrice) : 0,
  };
}
