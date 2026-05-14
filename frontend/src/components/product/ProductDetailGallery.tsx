import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { OUT_OF_STOCK_LABEL, PLACEHOLDER_PRODUCT_IMAGE } from '@/constants/product.constants';
import { ProductImage } from '@/types';

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
  const handlePrevious = () => {
    onImageSelect(selectedImageIndex === 0 ? images.length - 1 : selectedImageIndex - 1);
  };

  const handleNext = () => {
    onImageSelect(selectedImageIndex === images.length - 1 ? 0 : selectedImageIndex + 1);
  };

  return (
    <div className="space-y-4">
      {/* Main Image */}
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
        <AnimatePresence mode="wait">
          <motion.div
            key={selectedImageIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="absolute inset-0"
          >
            <Image
              src={images[selectedImageIndex]?.url || PLACEHOLDER_PRODUCT_IMAGE}
              alt={images[selectedImageIndex]?.alt_text || productName}
              fill
              className="object-cover"
              priority
              sizes="(max-width: 1024px) 100vw, 50vw"
            />
          </motion.div>
        </AnimatePresence>

        {/* Navigation Arrows */}
        {images.length > 1 && (
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
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((image, index) => (
            <motion.button
              key={index}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => onImageSelect(index)}
              className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${
                selectedImageIndex === index ? 'border-primary' : 'border-transparent'
              }`}
            >
              <Image
                src={image.url}
                alt={image.alt_text || `${productName} thumbnail ${index + 1}`}
                fill
                className="object-cover"
                sizes="80px"
              />
            </motion.button>
          ))}
        </div>
      )}
    </div>
  );
}
