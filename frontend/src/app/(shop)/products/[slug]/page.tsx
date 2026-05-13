'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { AuthRequiredDialog } from '@/components/common/auth-required-dialog';
import { ProductGrid } from '@/components/product/product-grid';
import { ProductDetailGallery } from '@/components/product/ProductDetailGallery';
import { ProductDetailInfo } from '@/components/product/ProductDetailInfo';
import { ProductDetailActions } from '@/components/product/ProductDetailActions';
import { ProductDetailTabs } from '@/components/product/ProductDetailTabs';
import { useProductDetail } from '@/hooks/useProductDetail';
import { useProductActions } from '@/hooks/useProductActions';

export default function ProductDetailPage() {
  const params = useParams();
  const slug = params.slug as string;

  const {
    product,
    relatedProducts,
    isLoading,
    error,
    selectedImage,
    setSelectedImage,
    selectedVariant,
    setSelectedVariant,
  } = useProductDetail(slug);

  const {
    quantity,
    isAddingToCart,
    showAuthDialog,
    setShowAuthDialog,
    handleAddToCart,
    incrementQuantity,
    decrementQuantity,
  } = useProductActions();

  if (isLoading) {
    return <ProductDetailSkeleton />;
  }

  if (error || !product) {
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
    ? Number(product.sale_price || product.regular_price) + Number(selectedVariant.price_adjustment ?? 0)
    : Number(product.sale_price || product.regular_price);

  const originalPrice = selectedVariant
    ? Number(product.regular_price) + Number(selectedVariant.price_adjustment ?? 0)
    : Number(product.regular_price);

  const discountPercentage = product.sale_price
    ? Math.round((1 - Number(product.sale_price) / Number(product.regular_price)) * 100)
    : 0;

  const stockQuantity = selectedVariant?.stock_quantity ?? product.stock_quantity;
  const isOutOfStock = stockQuantity === 0;

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
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span>/</span>
          <Link href="/products" className="hover:text-foreground">
            Products
          </Link>
          <span>/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid lg:grid-cols-2 gap-12">
          {/* Image Gallery */}
          <ProductDetailGallery
            images={images}
            productName={product.name}
            selectedImageIndex={selectedImage}
            onImageSelect={setSelectedImage}
            discountPercentage={discountPercentage}
            isOutOfStock={isOutOfStock}
          />

          {/* Product Info */}
          <div className="space-y-6">
            <ProductDetailInfo
              product={product}
              selectedVariant={selectedVariant}
              onVariantSelect={setSelectedVariant}
              currentPrice={currentPrice}
              originalPrice={originalPrice}
              stockQuantity={stockQuantity}
            />

            <ProductDetailActions
              productId={product.id}
              productName={product.name}
              quantity={quantity}
              stockQuantity={stockQuantity}
              isOutOfStock={isOutOfStock}
              isAddingToCart={isAddingToCart}
              onQuantityIncrease={() => incrementQuantity(stockQuantity)}
              onQuantityDecrease={decrementQuantity}
              onAddToCart={() => handleAddToCart(product.id, selectedVariant?.id, product.name)}
            />
          </div>
        </div>

        {/* Tabs */}
        <ProductDetailTabs
          productId={product.id}
          description={product.description || ''}
          reviewCount={24}
        />

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
