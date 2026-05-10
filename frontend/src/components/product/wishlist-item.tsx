'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, ShoppingBag, X } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { formatCurrency } from '@/utils';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { toast } from 'sonner';

interface WishlistItemProps {
  wishlistId: string;
  product: Product;
  index?: number;
}

export function WishlistItem({ wishlistId, product, index = 0 }: WishlistItemProps) {
  const [isImageLoaded, setIsImageLoaded] = useState(false);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isRemoving, setIsRemoving] = useState(false);
  const { addToCart } = useCartStore();
  const { removeFromWishlist } = useWishlistStore();

  const discountPercentage = product.sale_price
    ? Math.round((1 - Number(product.sale_price) / Number(product.regular_price)) * 100)
    : 0;

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

  const handleRemoveFromWishlist = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    setIsRemoving(true);
    try {
      await removeFromWishlist(wishlistId);
      toast.success('Removed from wishlist');
    } catch (error) {
      // Error already handled with toast in store
    } finally {
      setIsRemoving(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.4, delay: index * 0.1 }}
    >
      <Link href={`/products/${product.slug}`}>
        <Card className="group overflow-hidden border-0 shadow-none bg-transparent hover:shadow-md transition-shadow">
          <CardContent className="p-0">
            {/* Image Container */}
            <div className="relative aspect-square overflow-hidden rounded-lg bg-muted">
              {/* Main Image */}
              <Image
                src={product.images?.[0]?.url || '/placeholder-product.jpg'}
                alt={product.name}
                fill
                className={`object-cover transition-all duration-500 ${
                  isImageLoaded ? 'opacity-100' : 'opacity-0'
                }`}
                onLoad={() => setIsImageLoaded(true)}
                sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              />

              {/* Badges */}
              <div className="absolute top-2 left-2 flex flex-col gap-1">
                {discountPercentage > 0 && (
                  <Badge variant="destructive" className="text-xs">
                    -{discountPercentage}%
                  </Badge>
                )}
              </div>

              {/* Wishlist Status Badge (always visible) */}
              <div className="absolute top-2 right-2">
                <motion.div
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="bg-red-500 rounded-full p-2"
                >
                  <Heart className="h-4 w-4 fill-white text-white" />
                </motion.div>
              </div>

              {/* Remove Button (visible on hover) */}
              <motion.div
                className="absolute bottom-0 left-0 right-0 p-3"
                initial={{ opacity: 0, y: 20 }}
                whileHover={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex gap-2">
                  <Button
                    className="flex-1 gap-2"
                    onClick={handleAddToCart}
                    disabled={isAddingToCart || product.stock_quantity === 0}
                  >
                    <ShoppingBag className="h-4 w-4" />
                    Add to Cart
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={handleRemoveFromWishlist}
                    disabled={isRemoving}
                    title="Remove from wishlist"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
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

              {/* Stock Status */}
              {product.stock_quantity === 0 && (
                <p className="text-xs text-destructive font-medium">Out of Stock</p>
              )}
            </div>
          </CardContent>
        </Card>
      </Link>
    </motion.div>
  );
}
