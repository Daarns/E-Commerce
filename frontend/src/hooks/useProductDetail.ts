import { useState, useEffect } from 'react';
import { productService } from '@/services/product';
import { Product, ProductVariant } from '@/types';

export function useProductDetail(slug: string) {
  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);

  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true);
      setError(null);
      try {
        const productData = await productService.getProduct(slug);
        setProduct(productData);

        if (productData.variants && productData.variants.length > 0) {
          setSelectedVariant(productData.variants[0]);
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

  return {
    product,
    relatedProducts,
    isLoading,
    error,
    selectedImage,
    setSelectedImage,
    selectedVariant,
    setSelectedVariant,
  };
}
