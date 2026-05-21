import { useState, useEffect } from 'react';
import { productService } from '@/services/product';
import { Product } from '@/types';
import {
  buildSelectedOptionsFromCombination,
  findMatchingCombination,
  getAvailableOptionIdsForType,
} from '@/utils';

export function useProductDetail(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true);
      setError(null);
      try {
        const productData = await productService.getProduct(slug);
        setProduct(productData);

        const firstAvailableCombination = productData.combinations?.find((combination) => (
          combination.is_active && combination.stock_quantity > 0
        ));

        if (firstAvailableCombination) {
          setSelectedOptions(buildSelectedOptionsFromCombination(productData, firstAvailableCombination));
        } else {
          setSelectedOptions({});
        }

        const related = await productService.getRelatedProducts(productData.id);
        setRelatedProducts(related);
      } catch (err) {
        setError('Failed to load product');
        console.error('Failed to fetch product:', err);
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  const selectedCombination = findMatchingCombination(
    product?.combinations,
    selectedOptions,
    product?.variant_types?.length ?? 0
  );

  const selectOption = (typeId: string, optionId: string): void => {
    if (!product) return;

    setSelectedOptions((previous) => {
      const next = { ...previous, [typeId]: optionId };

      product.variant_types?.forEach((variantType) => {
        const selectedOptionId = next[variantType.id];
        if (!selectedOptionId || variantType.id === typeId) return;

        const availableOptionIds = getAvailableOptionIdsForType(
          variantType.id,
          next,
          product.combinations
        );
        if (!availableOptionIds.has(selectedOptionId)) {
          delete next[variantType.id];
        }
      });

      return next;
    });
  };

  useEffect(() => {
    if (!product?.images?.length || !product.variant_types?.length) return;

    const visualOptionIds = product.variant_types
      .filter((variantType) => variantType.is_visual)
      .map((variantType) => selectedOptions[variantType.id])
      .filter(Boolean);

    const defaultImageIndex = product.images.findIndex((image) => !image.option_id);

    if (visualOptionIds.length === 0) {
      setSelectedImage(defaultImageIndex >= 0 ? defaultImageIndex : 0);
      return;
    }

    const imageIndex = product.images.findIndex((image) => (
      image.option_id !== undefined && visualOptionIds.includes(image.option_id)
    ));
    setSelectedImage(imageIndex >= 0 ? imageIndex : defaultImageIndex >= 0 ? defaultImageIndex : 0);
  }, [product, selectedOptions]);

  return {
    product,
    relatedProducts,
    isLoading,
    error,
    selectedImage,
    setSelectedImage,
    selectedOptions,
    selectOption,
    selectedCombination,
  };
}
