'use client';

import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  LOW_STOCK_THRESHOLD,
  OUT_OF_STOCK_LABEL,
  PLACEHOLDER_PRODUCT_IMAGE,
  PRODUCT_CARD_IMAGE_FIT_CLASS,
  PRODUCT_CARD_IMAGE_FRAME_CLASS,
  PRODUCT_STOCK_STATUS,
} from '@/constants/product.constants';
import { useProductCard } from '@/hooks/useProductCard';
import { Product } from '@/types';
import { QuickViewModal } from '@/components/product/quick-view-modal';
import { AuthRequiredDialog } from '@/components/common/auth-required-dialog';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const {
    cardRef,
    isHovered,
    imageLoaded,
    showQuickView,
    isAddingToCart,
    authDialog,
    priceLabel,
    originalPriceLabel,
    primaryImageUrl,
    hoverImageUrl,
    imagePriority,
    discountPercentage,
    availableStock,
    addToCartLabel,
    isWishlisted,
    isToggling,
    setIsHovered,
    setImageLoaded,
    setShowQuickView,
    setAuthDialog,
    handleAddToCart,
    handleToggleWishlist,
    openQuickView,
  } = useProductCard({ product, index });

  return (
    <>
      <motion.div
        ref={cardRef}
        className="h-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <Link href={`/products/${product.slug}`} className="block h-full">
          <Card
            className="group h-full overflow-hidden rounded-lg border bg-card shadow-none transition-colors hover:border-foreground/20"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <CardContent className="flex h-full flex-col p-0">
              {/* Image Container */}
              <div className={PRODUCT_CARD_IMAGE_FRAME_CLASS}>
                {/* Main Image */}
                <Image
                  src={primaryImageUrl ?? PLACEHOLDER_PRODUCT_IMAGE}
                  alt={product.name}
                  fill
                  className={`${PRODUCT_CARD_IMAGE_FIT_CLASS} transition-all duration-500 ${
                    isHovered ? 'scale-110' : 'scale-100'
                  } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageLoaded(true)}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  priority={imagePriority}
                  unoptimized={primaryImageUrl?.startsWith('http://localhost') ?? false}
                />

                {/* Hover Image (if available) */}
                {hoverImageUrl && (
                  <Image
                    src={hoverImageUrl}
                    alt={product.name}
                    fill
                    className={`${PRODUCT_CARD_IMAGE_FIT_CLASS} absolute inset-0 transition-opacity duration-500 ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                    unoptimized={hoverImageUrl.startsWith('http://localhost')}
                  />
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {discountPercentage > 0 && (
                    <Badge variant="destructive" className="text-xs discount-badge">
                      -{discountPercentage}%
                    </Badge>
                  )}
                  {availableStock < LOW_STOCK_THRESHOLD && availableStock > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      {PRODUCT_STOCK_STATUS.lowStock.label}
                    </Badge>
                  )}
                  {availableStock === 0 && (
                    <Badge variant="outline" className="text-xs bg-background">
                      {OUT_OF_STOCK_LABEL}
                    </Badge>
                  )}
                </div>

                {/* Quick Actions */}
                <motion.div
                  className="absolute top-2 right-2 flex flex-col gap-2"
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: isHovered ? 1 : 0, x: isHovered ? 0 : 10 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    size="icon"
                    variant="ghost"
                    className={`h-8 w-8 rounded-full shadow-lg transition-colors ${
                      isWishlisted ? 'bg-red-500 hover:bg-red-600' : ''
                    }`}
                    onClick={(event) => void handleToggleWishlist(event)}
                    disabled={isToggling}
                  >
                    <Heart
                      className={`h-4 w-4 ${
                        isWishlisted ? 'fill-white text-white' : ''
                      }`}
                    />
                  </Button>
                  <Button
                    size="icon"
                    variant="secondary"
                    className="h-8 w-8 rounded-full shadow-lg"
                    onClick={openQuickView}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </motion.div>

                {/* Add to Cart Button */}
                <motion.div
                  className="absolute bottom-0 left-0 right-0 p-3"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 20 }}
                  transition={{ duration: 0.2 }}
                >
                  <Button
                    className="w-full gap-2"
                    onClick={(event) => void handleAddToCart(event)}
                    disabled={isAddingToCart || availableStock === 0}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    {addToCartLabel}
                  </Button>
                </motion.div>
              </div>

              {/* Product Info */}
              <div className="flex min-h-[7.25rem] flex-1 flex-col justify-between p-3">
                <div className="space-y-1.5">
                  <p className="text-xs text-muted-foreground truncate">
                    {product.category?.name}
                  </p>
                  <h3 className="line-clamp-2 min-h-10 text-sm font-medium leading-5">
                    {product.name}
                  </h3>
                </div>

                {/* Price */}
                <div className="min-h-9 space-y-0.5 pt-2">
                  <span className="block text-sm font-bold">
                    {priceLabel}
                  </span>
                  {originalPriceLabel && (
                    <span className="block text-xs text-muted-foreground line-through">
                      {originalPriceLabel}
                    </span>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </Link>
      </motion.div>

      {showQuickView && (
        <QuickViewModal
          product={product}
          isOpen={showQuickView}
          onClose={() => setShowQuickView(false)}
        />
      )}

      <AuthRequiredDialog
        open={authDialog !== null}
        onClose={() => setAuthDialog(null)}
        feature={authDialog ?? 'cart'}
      />
    </>
  );
}
