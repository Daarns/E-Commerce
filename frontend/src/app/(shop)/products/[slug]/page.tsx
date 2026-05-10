'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { Minus, Plus, ShoppingBag, Share2, ChevronLeft, ChevronRight, Star, Truck, Shield, RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { VariantSelector } from '@/components/product/variant-selector';
import { ProductGrid } from '@/components/product/product-grid';
import { WishlistButton } from '@/components/product/wishlist-button';
import { ReviewsSection } from '@/components/product/reviews-section';
import { AuthRequiredDialog } from '@/components/common/auth-required-dialog';
import { productService } from '@/services/product';
import { useCartStore } from '@/stores/cart-store';
import { useAuthStore } from '@/stores/auth-store';
import { Product, ProductVariant } from '@/types';
import { formatCurrency } from '@/utils';
import { toast } from 'sonner';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const [product, setProduct] = useState<Product | null>(null);
  const [relatedProducts, setRelatedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState(0);
  const [selectedVariant, setSelectedVariant] = useState<ProductVariant | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [isAddingToCart, setIsAddingToCart] = useState(false);
  const [showAuthDialog, setShowAuthDialog] = useState(false);

  const { addToCart } = useCartStore();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);

  useEffect(() => {
    async function fetchProduct() {
      setIsLoading(true);
      try {
        const productData = await productService.getProduct(slug);
        setProduct(productData);

        // Set default variant if available
        if (productData.variants && productData.variants.length > 0) {
          setSelectedVariant(productData.variants[0]);
        }

        // Fetch related products
        const related = await productService.getRelatedProducts(productData.id);
        setRelatedProducts(related);
      } catch (error) {
        console.error('Failed to fetch product:', error);
      } finally {
        setIsLoading(false);
      }
    }

    if (slug) {
      fetchProduct();
    }
  }, [slug]);

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (!product) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <h1 className="text-2xl font-bold mb-4">Product Not Found</h1>
        <p className="text-muted-foreground mb-8">
          The product you&apos;re looking for doesn&apos;t exist or has been removed.
        </p>
        <Button asChild>
          <Link href="/products">Browse Products</Link>
        </Button>
      </div>
    );
  }

  const images = product.images && product.images.length > 0
    ? product.images
    : [{ id: 'placeholder', url: '/placeholder-product.jpg', alt_text: product.name, is_primary: true, sort_order: 0 }];

  const currentPrice = selectedVariant
    ? Number(product.sale_price || product.regular_price) + selectedVariant.price_adjustment
    : (product.sale_price || product.regular_price);

  const originalPrice = selectedVariant
    ? Number(product.regular_price) + selectedVariant.price_adjustment
    : product.regular_price;

  const discountPercentage = product.sale_price
    ? Math.round((1 - Number(product.sale_price) / Number(product.regular_price)) * 100)
    : 0;

  const stockQuantity = selectedVariant?.stock_quantity ?? product.stock_quantity;
  const isOutOfStock = stockQuantity === 0;

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      setShowAuthDialog(true);
      return;
    }
    setIsAddingToCart(true);
    try {
      await addToCart(product.id, quantity, selectedVariant?.id);
      toast.success('Added to cart', {
        description: `${quantity}x ${product.name}`,
      });
    } catch {
      toast.error('Failed to add to cart');
    } finally {
      setIsAddingToCart(false);
    }
  };

  return (
    <>
      <AuthRequiredDialog
        open={showAuthDialog}
        onClose={() => setShowAuthDialog(false)}
        feature="cart"
      />
      <div className="container mx-auto px-4 py-8">
        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-sm text-muted-foreground mb-8">
          <Link href="/" className="hover:text-foreground">Home</Link>
          <span>/</span>
          <Link href="/products" className="hover:text-foreground">Products</Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <div className="space-y-4">
            {/* Main Image */}
            <div className="relative aspect-square overflow-hidden rounded-2xl bg-muted">
              <AnimatePresence mode="wait">
                <motion.div
                  key={selectedImage}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="absolute inset-0"
                >
                  <Image
                    src={images[selectedImage]?.url || '/placeholder-product.jpg'}
                    alt={images[selectedImage]?.alt_text || product.name}
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
                    onClick={() => setSelectedImage((prev) => (prev === 0 ? images.length - 1 : prev - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full"
                    onClick={() => setSelectedImage((prev) => (prev === images.length - 1 ? 0 : prev + 1))}
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
                  <Badge variant="secondary">Out of Stock</Badge>
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
                    onClick={() => setSelectedImage(index)}
                    className={`relative w-20 h-20 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-colors ${selectedImage === index ? 'border-primary' : 'border-transparent'
                      }`}
                  >
                    <Image
                      src={image.url}
                      alt={image.alt_text || `${product.name} thumbnail ${index + 1}`}
                      fill
                      className="object-cover"
                      sizes="80px"
                    />
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Product Info */}
          <div className="space-y-6">
            {/* Header */}
            <div>
              {product.brand && (
                <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>
              )}
              <h1 className="text-3xl font-bold mb-2">{product.name}</h1>

              {/* Rating */}
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`h-4 w-4 ${i < 4 ? 'fill-yellow-400 text-yellow-400' : 'text-muted'}`}
                    />
                  ))}
                </div>
                <span className="text-sm text-muted-foreground">(24 reviews)</span>
              </div>
            </div>

            {/* Price */}
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-bold">{formatCurrency(currentPrice)}</span>
              {product.sale_price && (
                <span className="text-xl text-muted-foreground line-through">
                  {formatCurrency(originalPrice)}
                </span>
              )}
            </div>

            {/* Short Description */}
            {product.short_description && (
              <p className="text-muted-foreground">{product.short_description}</p>
            )}

            <Separator />

            {/* Variants */}
            {product.variants && product.variants.length > 0 && (
              <VariantSelector
                variants={product.variants.map(v => ({
                  id: v.id,
                  type: v.variant_type,
                  value: v.variant_value,
                  price_adjustment: v.price_adjustment,
                  stock_quantity: v.stock_quantity,
                  image_url: v.image_url,
                }))}
                selectedVariant={selectedVariant ? {
                  id: selectedVariant.id,
                  type: selectedVariant.variant_type,
                  value: selectedVariant.variant_value,
                  price_adjustment: selectedVariant.price_adjustment,
                  stock_quantity: selectedVariant.stock_quantity,
                  image_url: selectedVariant.image_url,
                } : null}
                onSelect={(v) => {
                  const variant = product.variants?.find(pv => pv.id === v.id);
                  if (variant) setSelectedVariant(variant);
                }}
              />
            )}

            {/* Quantity */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Quantity</label>
              <div className="flex items-center gap-3">
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.max(1, quantity - 1))}
                    disabled={quantity <= 1}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-12 text-center font-medium">{quantity}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setQuantity(Math.min(stockQuantity, quantity + 1))}
                    disabled={quantity >= stockQuantity}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                {stockQuantity > 0 && stockQuantity < 10 && (
                  <span className="text-sm text-orange-500">
                    Only {stockQuantity} left in stock
                  </span>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <Button
                className="flex-1 gap-2"
                size="lg"
                onClick={handleAddToCart}
                disabled={isOutOfStock || isAddingToCart}
              >
                <ShoppingBag className="h-5 w-5" />
                {isAddingToCart ? 'Adding...' : isOutOfStock ? 'Out of Stock' : 'Add to Cart'}
              </Button>
              <WishlistButton productId={product.id} size="lg" />
              <Button variant="outline" size="lg">
                <Share2 className="h-5 w-5" />
              </Button>
            </div>

            {/* Trust Badges */}
            <div className="grid grid-cols-3 gap-4 py-6 border-t border-b">
              <div className="flex flex-col items-center text-center gap-2">
                <Truck className="h-6 w-6 text-primary" />
                <span className="text-xs">Free Shipping</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <Shield className="h-6 w-6 text-primary" />
                <span className="text-xs">Secure Payment</span>
              </div>
              <div className="flex flex-col items-center text-center gap-2">
                <RefreshCcw className="h-6 w-6 text-primary" />
                <span className="text-xs">Easy Returns</span>
              </div>
            </div>

            {/* SKU & Category */}
            <div className="text-sm text-muted-foreground space-y-1">
              {product.sku && <p>SKU: {product.sku}</p>}
              {product.category && <p>Category: {product.category.name}</p>}
            </div>
          </div>
        </div>

        {/* Tabs */}
        <Tabs defaultValue="description" className="mt-16">
          <TabsList className="w-full justify-start border-b rounded-none bg-transparent h-auto p-0">
            <TabsTrigger
              value="description"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Description
            </TabsTrigger>
            <TabsTrigger
              value="reviews"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Reviews (24)
            </TabsTrigger>
            <TabsTrigger
              value="shipping"
              className="rounded-none border-b-2 border-transparent data-[state=active]:border-primary data-[state=active]:bg-transparent px-6 py-3"
            >
              Shipping & Returns
            </TabsTrigger>
          </TabsList>

          <TabsContent value="description" className="py-6">
            <div className="prose max-w-none">
              {product.description || 'No description available.'}
            </div>
          </TabsContent>

          <TabsContent value="reviews" className="py-6">
            <ReviewsSection productId={product.id} />
          </TabsContent>

          <TabsContent value="shipping" className="py-6">
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold mb-2">Shipping</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>Free shipping on orders over Rp 500.000</li>
                  <li>Standard delivery: 3-5 business days</li>
                  <li>Express delivery: 1-2 business days</li>
                </ul>
              </div>
              <div>
                <h3 className="font-semibold mb-2">Returns</h3>
                <ul className="list-disc list-inside text-muted-foreground space-y-1">
                  <li>30-day return policy</li>
                  <li>Items must be unworn with tags attached</li>
                  <li>Free returns on all orders</li>
                </ul>
              </div>
            </div>
          </TabsContent>
        </Tabs>

        {/* Related Products */}
        {relatedProducts.length > 0 && (
          <section className="mt-16">
            <h2 className="text-2xl font-bold mb-8">You May Also Like</h2>
            <ProductGrid products={relatedProducts} columns={4} />
          </section>
        )}
      </div>
    </>
  );
}

function ProductDetailSkeleton() {
  return (
    <div className="container mx-auto px-4 py-8">
      <Skeleton className="h-4 w-48 mb-8" />
      <div className="grid lg:grid-cols-2 gap-12">
        <div className="space-y-4">
          <Skeleton className="aspect-square rounded-2xl" />
          <div className="flex gap-2">
            {[...Array(4)].map((_, i) => (
              <Skeleton key={i} className="w-20 h-20 rounded-lg" />
            ))}
          </div>
        </div>
        <div className="space-y-6">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-10 w-3/4" />
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-20 w-full" />
          <Skeleton className="h-12 w-full" />
        </div>
      </div>
    </div>
  );
}
