'use client';

import Image from 'next/image';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ShoppingBag, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { OUT_OF_STOCK_LABEL, PLACEHOLDER_PRODUCT_IMAGE } from '@/constants/product.constants';
import { useQuickViewProduct } from '@/hooks/useQuickViewProduct';
import { Product } from '@/types';
import { getProductImageUrl, shouldBypassNextImageOptimizer } from '@/utils';
import { AuthRequiredDialog } from '@/components/common/auth-required-dialog';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const {
    currentImageIndex,
    quantity,
    isAddingToCart,
    isAddingToWishlist,
    authDialog,
    isWishlisted,
    discountPercentage,
    priceLabel,
    originalPriceLabel,
    availableStock,
    actionLabel,
    setCurrentImageIndex,
    setAuthDialog,
    handleNextImage,
    handlePrevImage,
    incrementQuantity,
    decrementQuantity,
    handleAddToCart,
    handleToggleWishlist,
  } = useQuickViewProduct({ product });

  if (!product || typeof document === 'undefined') return null;

  const images = product.images || [];
  const currentImage = images[currentImageIndex];
  const currentImageUrl = getProductImageUrl(currentImage) ?? PLACEHOLDER_PRODUCT_IMAGE;

  const modal = (
    <>
      <AnimatePresence>
        {isOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onClose}
              className="fixed inset-0 bg-black/50 z-40"
            />

            {/* Modal */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed left-1/2 top-1/2 z-50 flex max-h-[calc(100vh-2rem)] w-[calc(100vw-1.5rem)] max-w-3xl -translate-x-1/2 -translate-y-1/2 flex-col overflow-hidden rounded-lg bg-background shadow-xl"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute right-4 top-4 z-10 rounded-full p-1 transition-colors hover:bg-muted"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="grid min-h-0 grid-cols-1 gap-5 overflow-y-auto p-5 md:grid-cols-[minmax(220px,0.9fr)_1fr] md:p-6">
                {/* Image Section */}
                <div className="space-y-4">
                  {/* Main Image */}
                  <div className="relative mx-auto aspect-square w-full max-w-[320px] overflow-hidden rounded-lg bg-muted md:max-w-none">
                    {currentImage ? (
                      <Image
                        src={currentImageUrl}
                        alt={product.name}
                        fill
                        className="object-contain p-2"
                        sizes="(max-width: 768px) 100vw, 50vw"
                        unoptimized={shouldBypassNextImageOptimizer(currentImageUrl)}
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-muted-foreground">
                        No image
                      </div>
                    )}

                    {/* Badges */}
                    <div className="absolute top-2 left-2 flex flex-col gap-1">
                      {discountPercentage > 0 && (
                        <Badge variant="destructive" className="text-xs">
                          -{discountPercentage}%
                        </Badge>
                      )}
                      {product.stock_quantity === 0 && (
                        <Badge variant="outline" className="text-xs bg-background">
                          {OUT_OF_STOCK_LABEL}
                        </Badge>
                      )}
                    </div>

                    {/* Image Navigation */}
                    {images.length > 1 && (
                      <>
                        <button
                          onClick={handlePrevImage}
                          className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1 rounded-full transition-colors"
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </button>
                        <button
                          onClick={handleNextImage}
                          className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 hover:bg-white p-1 rounded-full transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>

                  {/* Thumbnail Navigation */}
                  {images.length > 1 && (
                    <div className="flex gap-2">
                      {images.map((img, idx) => {
                        const thumbnailUrl = getProductImageUrl(img) ?? PLACEHOLDER_PRODUCT_IMAGE;

                        return (
                        <button
                          key={idx}
                          onClick={() => setCurrentImageIndex(idx)}
                          className={`relative h-16 w-16 rounded border-2 overflow-hidden transition-colors ${
                            idx === currentImageIndex
                              ? 'border-primary'
                              : 'border-muted'
                          }`}
                        >
                          <Image
                            src={thumbnailUrl}
                            alt={`${product.name} ${idx + 1}`}
                            fill
                            className="object-cover"
                            sizes="64px"
                            unoptimized={shouldBypassNextImageOptimizer(thumbnailUrl)}
                          />
                        </button>
                        );
                      })}
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="space-y-4 pr-1">
                  {/* Product Info */}
                  <div>
                    <h2 className="mb-2 pr-8 text-2xl font-bold">{product.name}</h2>
                    {product.brand && (
                      <p className="text-sm text-muted-foreground mb-2">{product.brand}</p>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-4">
                      <span className="text-2xl font-bold">{priceLabel}</span>
                      {originalPriceLabel && (
                        <span className="text-lg text-muted-foreground line-through">
                          {originalPriceLabel}
                        </span>
                      )}
                    </div>

                    {/* Stock Status */}
                    <div className="mb-4">
                      {availableStock > 0 ? (
                        <p className="text-sm text-green-600">
                          In Stock ({availableStock} available)
                        </p>
                      ) : (
                        <p className="text-sm text-red-600">{OUT_OF_STOCK_LABEL}</p>
                      )}
                    </div>
                  </div>

                  {/* Description */}
                  {product.description && (
                    <div>
                      <h3 className="font-semibold mb-2">Description</h3>
                      <p className="text-sm text-muted-foreground line-clamp-4">
                        {product.description}
                      </p>
                    </div>
                  )}

                  {/* Category */}
                  {product.category && (
                    <div>
                      <h3 className="font-semibold mb-2">Category</h3>
                      <p className="text-sm">{product.category.name}</p>
                    </div>
                  )}

                  {/* Quantity Selector */}
                  <div className="flex items-center gap-4">
                    <span className="text-sm font-medium">Quantity:</span>
                    <div className="flex items-center border rounded">
                      <button
                        onClick={decrementQuantity}
                        disabled={quantity === 1}
                        className="px-3 py-2 hover:bg-muted disabled:opacity-50"
                      >
                        −
                      </button>
                      <span className="px-6 py-2 border-x">{quantity}</span>
                      <button
                        onClick={incrementQuantity}
                        disabled={quantity >= availableStock}
                        className="px-3 py-2 hover:bg-muted disabled:opacity-50"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-4">
                    <Button
                      className="flex-1 gap-2"
                      onClick={() => void handleAddToCart()}
                      disabled={availableStock === 0 || isAddingToCart}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {isAddingToCart ? 'Adding...' : actionLabel}
                    </Button>
                    <Button
                      variant={isWishlisted ? 'default' : 'outline'}
                      size="icon"
                      onClick={() => void handleToggleWishlist()}
                      disabled={isAddingToWishlist}
                      className={isWishlisted ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100' : ''}
                    >
                      <Heart
                        className={`h-4 w-4 ${isWishlisted ? 'fill-red-500 text-red-500' : ''}`}
                      />
                    </Button>
                  </div>

                  {/* View Details Link */}
                  <Button variant="outline" className="w-full" asChild>
                    <a href={`/products/${product.slug}`}>View Full Details</a>
                  </Button>
                </div>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <AuthRequiredDialog
        open={authDialog !== null}
        onClose={() => setAuthDialog(null)}
        feature={authDialog ?? 'cart'}
      />
    </>
  );

  return createPortal(modal, document.body);
}
