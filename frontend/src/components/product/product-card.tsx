'use client';

import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { animate } from 'animejs';
import { Heart, ShoppingBag, Eye } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { QuickViewModal } from '@/components/product/quick-view-modal';
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showQuickView, setShowQuickView] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const { addToCart } = useCartStore();
  const { toggleWishlist } = useWishlistStore();
  // Subscribe to wishlist items changes
  const isWishlisted = useWishlistStore((state) => state.items.some((item) => item.product_id === product.id));
  const isToggling = useWishlistStore((state) => state.isToggling(product.id));
  const cardRef = useRef<HTMLDivElement>(null);

  const discountPercentage = product.sale_price
    ? Math.round((1 - product.sale_price / product.regular_price) * 100)
    : 0;

  // Anime.js badge animation on mount
  useEffect(() => {
    if (discountPercentage > 0 && cardRef.current) {
      const badge = cardRef.current.querySelector('.discount-badge');
      if (badge) {
        animate(badge, {
          scale: [0, 1],
          rotate: [45, 0],
          duration: 600,
          delay: index * 100,
          ease: 'outElastic(1, .6)',
        });
      }
    }
  }, [discountPercentage, index]);

  const handleAddToCart = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    setIsAddingToCart(true);
    try {
      await addToCart(product.id, 1);
      toast.success('Added to cart', {
        description: product.name,
      });
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    try {
      await toggleWishlist(product.id);
    } catch {
      // Error is already handled with toast in store
    }
  };

  return (
    <>
      <motion.div
        ref={cardRef}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: index * 0.1 }}
      >
        <Link href={`/products/${product.slug}`}>
          <Card 
            className="group overflow-hidden border-0 shadow-none bg-transparent"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
          >
            <CardContent className="p-0">
              {/* Image Container */}
              <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
                {/* Main Image */}
                <Image
                  src={product.images?.[0]?.url || '/placeholder-product.jpg'}
                  alt={product.name}
                  fill
                  className={`object-cover transition-all duration-500 ${
                    isHovered ? 'scale-110' : 'scale-100'
                  } ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  onLoad={() => setImageLoaded(true)}
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                />
                
                {/* Hover Image (if available) */}
                {product.images?.[1] && (
                  <Image
                    src={product.images[1].url}
                    alt={product.name}
                    fill
                    className={`object-cover absolute inset-0 transition-opacity duration-500 ${
                      isHovered ? 'opacity-100' : 'opacity-0'
                    }`}
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  />
                )}

                {/* Badges */}
                <div className="absolute top-2 left-2 flex flex-col gap-1">
                  {discountPercentage > 0 && (
                    <Badge variant="destructive" className="text-xs discount-badge">
                      -{discountPercentage}%
                    </Badge>
                  )}
                  {product.stock_quantity < 10 && product.stock_quantity > 0 && (
                    <Badge variant="secondary" className="text-xs">
                      Low Stock
                    </Badge>
                  )}
                  {product.stock_quantity === 0 && (
                    <Badge variant="outline" className="text-xs bg-background">
                      Out of Stock
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
                    onClick={handleToggleWishlist}
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
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setShowQuickView(true);
                    }}
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
                    onClick={handleAddToCart}
                    disabled={isAddingToCart || product.stock_quantity === 0}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </Button>
                </motion.div>
              </div>

              {/* Product Info */}
              <div className="p-3 space-y-2">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground truncate">
                    {product.category?.name}
                  </p>
                  <h3 className="font-medium text-sm line-clamp-2">
                    {product.name}
                  </h3>
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-2">
                  <span className="text-sm font-bold">
                    {formatCurrency(product.sale_price || product.regular_price)}
                  </span>
                  {product.sale_price && (
                    <span className="text-xs text-muted-foreground line-through">
                      {formatCurrency(product.regular_price)}
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
    </>
  );
}
