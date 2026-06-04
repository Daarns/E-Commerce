import { useState, useEffect } from 'react';
import axios from 'axios';
import { productService } from '@/services/product';
import { Product } from '@/types';
import {
  findMatchingCombination,
  getAvailableOptionIdsForType,
  getInitialProductImageIndex,
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
        setSelectedOptions({});
        setSelectedImage(getInitialProductImageIndex(productData.images));

        const related = await productService.getRelatedProducts(productData.id);
        setRelatedProducts(related);
      } catch (err: unknown) {
        setError('Produk tidak tersedia');
        if (!isExpectedProductNotFound(err) && process.env.NODE_ENV !== 'production') {
          console.warn('Failed to fetch product:', getErrorMessage(err));
        }
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

    const defaultImageIndex = getInitialProductImageIndex(product.images);

    if (visualOptionIds.length === 0) {
      setSelectedImage(defaultImageIndex);
      return;
    }

    const imageIndex = product.images.findIndex((image) => (
      image.option_id !== undefined && visualOptionIds.includes(image.option_id)
    ));
    setSelectedImage(imageIndex >= 0 ? imageIndex : defaultImageIndex);
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

function isExpectedProductNotFound(error: unknown): boolean {
  return axios.isAxiosError(error) && error.response?.status === 404;
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return String(error);
}
