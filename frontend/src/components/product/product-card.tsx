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
import { toast } from 'sonner';

interface ProductCardProps {
  product: Product;
  index?: number;
}

export function ProductCard({ product, index = 0 }: ProductCardProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const { addToCart } = useCartStore();
  const [isAddingToCart, setIsAddingToCart] = useState(false);
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

  return (
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
            <div className="relative aspect-[3/4] overflow-hidden rounded-lg bg-muted">
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
                  variant="secondary"
                  className="h-8 w-8 rounded-full shadow-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // TODO: Add to wishlist
                    toast.info('Wishlist coming soon');
                  }}
                >
                  <Heart className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8 rounded-full shadow-lg"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    // TODO: Quick view
                    toast.info('Quick view coming soon');
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
                  disabled={product.stock_quantity === 0 || isAddingToCart}
                >
                  <ShoppingBag className="h-4 w-4" />
                  {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                </Button>
              </motion.div>
            </div>

            {/* Product Info */}
            <div className="pt-4 space-y-1">
              <h3 className="font-medium text-sm line-clamp-2 group-hover:text-primary transition-colors">
                {product.name}
              </h3>
              {product.brand && (
                <p className="text-xs text-muted-foreground">{product.brand}</p>
              )}
              <div className="flex items-center gap-2">
                {product.sale_price ? (
                  <>
                    <span className="font-semibold">
                      {formatCurrency(product.sale_price)}
                    </span>
                    <span className="text-sm text-muted-foreground line-through">
                      {formatCurrency(product.regular_price)}
                    </span>
                  </>
                ) : (
                  <span className="font-semibold">
                    {formatCurrency(product.regular_price)}
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
