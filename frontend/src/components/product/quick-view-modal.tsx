'use client';

import { useState } from 'react';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { X, ChevronLeft, ChevronRight, ShoppingBag, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Product } from '@/types';
import { formatCurrency } from '@/lib/utils';
import { useCartStore } from '@/stores/cart-store';
import { useWishlistStore } from '@/stores/wishlist-store';
import { useAuthStore } from '@/stores/auth-store';
import { AuthRequiredDialog } from '@/components/common/auth-required-dialog';
import { toast } from 'sonner';

interface QuickViewModalProps {
  product: Product | null;
  isOpen: boolean;
  onClose: () => void;
}

export function QuickViewModal({ product, isOpen, onClose }: QuickViewModalProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const { addToCart } = useCartStore();
  const { addToWishlist, isInWishlist } = useWishlistStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [isAddingToWishlist, setIsAddingToWishlist] = useState(false);
  const [authDialog, setAuthDialog] = useState<'cart' | 'wishlist' | null>(null);

  if (!product) return null;

  const images = product.images || [];
  const currentImage = images[currentImageIndex];

  const discountPercentage = product.sale_price
    ? Math.round((1 - product.sale_price / product.regular_price) * 100)
    : 0;

  const isWishlisted = isInWishlist(product.id);

  const handleNextImage = () => {
    setCurrentImageIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrevImage = () => {
    setCurrentImageIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  const handleAddToCart = async () => {
    if (!isAuthenticated) { setAuthDialog('cart'); return; }
    setIsAddingToCart(true);
    try {
      await addToCart(product.id, quantity);
      toast.success('Added to cart', {
        description: `${quantity} x ${product.name}`,
      });
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  const handleToggleWishlist = async () => {
    if (!isAuthenticated) { setAuthDialog('wishlist'); return; }
    setIsAddingToWishlist(true);
    try {
      if (isWishlisted) {
        const wishlistItem = useWishlistStore.getState().items.find(
          (item) => item.product_id === product.id
        );
        if (wishlistItem) {
          await useWishlistStore.getState().removeFromWishlist(wishlistItem.id);
        }
      } else {
        await addToWishlist(product.id);
      }
    } catch {
      toast.error('Failed to update wishlist');
    } finally {
      setIsAddingToWishlist(false);
    }
  };

  return (
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
              className="fixed left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl max-h-[90vh] overflow-y-auto bg-background rounded-lg shadow-lg z-50 p-6"
            >
              {/* Close Button */}
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-1 hover:bg-muted rounded-full transition-colors"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Image Section */}
                <div className="space-y-4">
                  {/* Main Image */}
                  <div className="relative aspect-square rounded-lg overflow-hidden bg-muted">
                    {currentImage ? (
                      <Image
                        src={currentImage.url}
                        alt={product.name}
                        fill
                        className="object-cover"
                        sizes="(max-width: 768px) 100vw, 50vw"
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
                          Out of Stock
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
                      {images.map((img, idx) => (
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
                            src={img.url}
                            alt={`${product.name} ${idx + 1}`}
                            fill
                            className="object-cover"
                            sizes="64px"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Details Section */}
                <div className="space-y-4">
                  {/* Product Info */}
                  <div>
                    <h2 className="text-2xl font-bold mb-2">{product.name}</h2>
                    {product.brand && (
                      <p className="text-sm text-muted-foreground mb-2">{product.brand}</p>
                    )}

                    {/* Price */}
                    <div className="flex items-center gap-2 mb-4">
                      {product.sale_price ? (
                        <>
                          <span className="text-2xl font-bold">
                            {formatCurrency(product.sale_price)}
                          </span>
                          <span className="text-lg text-muted-foreground line-through">
                            {formatCurrency(product.regular_price)}
                          </span>
                        </>
                      ) : (
                        <span className="text-2xl font-bold">
                          {formatCurrency(product.regular_price)}
                        </span>
                      )}
                    </div>

                    {/* Stock Status */}
                    <div className="mb-4">
                      {product.stock_quantity > 0 ? (
                        <p className="text-sm text-green-600">
                          ✓ In Stock ({product.stock_quantity} available)
                        </p>
                      ) : (
                        <p className="text-sm text-red-600">Out of Stock</p>
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
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        disabled={quantity === 1}
                        className="px-3 py-2 hover:bg-muted disabled:opacity-50"
                      >
                        −
                      </button>
                      <span className="px-6 py-2 border-x">{quantity}</span>
                      <button
                        onClick={() => setQuantity(quantity + 1)}
                        disabled={quantity >= product.stock_quantity}
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
                      onClick={handleAddToCart}
                      disabled={product.stock_quantity === 0 || isAddingToCart}
                    >
                      <ShoppingBag className="h-4 w-4" />
                      {isAddingToCart ? 'Adding...' : 'Add to Cart'}
                    </Button>
                    <Button
                      variant={isWishlisted ? 'default' : 'outline'}
                      size="icon"
                      onClick={handleToggleWishlist}
                      disabled={isAddingToWishlist}
                      className={isWishlisted ? 'bg-red-500 hover:bg-red-600' : ''}
                    >
                      <Heart
                        className="h-4 w-4"
                        fill={isWishlisted ? 'currentColor' : 'none'}
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
}
