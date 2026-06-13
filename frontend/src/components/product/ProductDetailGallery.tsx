import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  OUT_OF_STOCK_LABEL,
  PLACEHOLDER_PRODUCT_IMAGE,
  PRODUCT_DETAIL_IMAGE_FRAME_CLASS,
  PRODUCT_IMAGE_FIT_CLASS,
} from '@/constants/product.constants';
import { ProductImage } from '@/types';
import { getProductGalleryImages, getProductImageUrl, shouldBypassNextImageOptimizer } from '@/utils';

interface ProductDetailGalleryProps {
  images: ProductImage[];
  productName: string;
  selectedImageIndex: number;
  onImageSelect: (index: number) => void;
  discountPercentage: number;
  isOutOfStock: boolean;
}

export function ProductDetailGallery({
  images,
  productName,
  selectedImageIndex,
  onImageSelect,
  discountPercentage,
  isOutOfStock,
}: ProductDetailGalleryProps) {
  const galleryImages = getProductGalleryImages(images);
  const selectedImageUrl = getProductImageUrl(images[selectedImageIndex]);
  const selectedDisplayImageUrl = selectedImageUrl ?? PLACEHOLDER_PRODUCT_IMAGE;

  const handlePrevious = () => {
    const selectedGalleryIndex = galleryImages.findIndex((entry) => (
      getProductImageUrl(entry.image) === selectedImageUrl
    ));
    const currentGalleryIndex = selectedGalleryIndex >= 0 ? selectedGalleryIndex : 0;
    const previousGalleryIndex = currentGalleryIndex === 0
      ? galleryImages.length - 1
      : currentGalleryIndex - 1;
    const previousImage = galleryImages[previousGalleryIndex];
    if (previousImage) onImageSelect(previousImage.originalIndex);
  };

  const handleNext = () => {
    const selectedGalleryIndex = galleryImages.findIndex((entry) => (
      getProductImageUrl(entry.image) === selectedImageUrl
    ));
    const currentGalleryIndex = selectedGalleryIndex >= 0 ? selectedGalleryIndex : 0;
    const nextGalleryIndex = currentGalleryIndex === galleryImages.length - 1
      ? 0
      : currentGalleryIndex + 1;
    const nextImage = galleryImages[nextGalleryIndex];
    if (nextImage) onImageSelect(nextImage.originalIndex);
  };

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className={PRODUCT_DETAIL_IMAGE_FRAME_CLASS}>
        <Image
          src={selectedDisplayImageUrl}
          alt={images[selectedImageIndex]?.alt_text || productName}
          fill
          className={PRODUCT_IMAGE_FIT_CLASS}
          loading="eager"
          fetchPriority="high"
          sizes="(max-width: 1024px) 100vw, 50vw"
          unoptimized={shouldBypassNextImageOptimizer(selectedDisplayImageUrl)}
        />

        {/* Navigation Arrows */}
        {galleryImages.length > 1 && (
          <>
            <Button
              variant="secondary"
              size="icon"
              className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full"
              onClick={handlePrevious}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="secondary"
              size="icon"
              className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full"
              onClick={handleNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </>
        )}

        {/* Badges */}
        <div className="absolute top-4 left-4 flex flex-col gap-2">
          {discountPercentage > 0 && (
            <Badge variant="destructive">-{discountPercentage}%</Badge>
          )}
          {isOutOfStock && (
            <Badge variant="secondary">{OUT_OF_STOCK_LABEL}</Badge>
          )}
        </div>
      </div>

      {/* Thumbnails */}
      {galleryImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {galleryImages.map(({ image, originalIndex }, index) => {
            const imageUrl = getProductImageUrl(image);
            const isSelected = selectedImageIndex === originalIndex || imageUrl === selectedImageUrl;

            return (
            <button
              key={`${imageUrl ?? image.id}-${originalIndex}`}
              onClick={() => onImageSelect(originalIndex)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                isSelected ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Image
                src={imageUrl ?? PLACEHOLDER_PRODUCT_IMAGE}
                alt={image.alt_text || `${productName} thumbnail ${index + 1}`}
                fill
                className={PRODUCT_IMAGE_FIT_CLASS}
                sizes="80px"
                unoptimized={shouldBypassNextImageOptimizer(imageUrl ?? PLACEHOLDER_PRODUCT_IMAGE)}
              />
            </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
