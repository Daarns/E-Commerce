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
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/constants/product.constants';
import { useProductDetail } from '@/hooks/useProductDetail';
import { useProductActions } from '@/hooks/useProductActions';
import { getProductPricing } from '@/utils';
import { ProductStructuredData } from '@/components/product/product-structured-data';

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
    selectedOptions,
    selectOption,
    selectedCombination,
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
        <h1 className="text-2xl font-bold mb-4">Produk tidak tersedia</h1>
        <p className="text-muted-foreground mb-8">
          Produk yang Anda cari tidak ada, belum tersedia, atau sudah tidak dijual.
        </p>
        <Button asChild>
          <Link href="/products">Lihat Produk Lain</Link>
        </Button>
      </div>
    );
  }

  const images = product.images && product.images.length > 0
    ? product.images
    : [{ id: 'placeholder', url: PLACEHOLDER_PRODUCT_IMAGE, alt_text: product.name, is_primary: true, sort_order: 0 }];

  const {
    currentPrice,
    originalPrice,
    priceAdjustment,
    hasDiscount,
    discountPercentage,
  } = getProductPricing(product, selectedCombination);

  const requiresCombination = Boolean(product.combinations?.length);
  const availableCombinationStock = (product.combinations ?? [])
    .filter((combination) => combination.is_active)
    .reduce((total, combination) => total + combination.stock_quantity, 0);
  const stockQuantity = requiresCombination
    ? selectedCombination?.stock_quantity ?? availableCombinationStock
    : product.stock_quantity;
  const requiresVariantSelection = requiresCombination && !selectedCombination && availableCombinationStock > 0;
  const isOutOfStock = requiresCombination
    ? availableCombinationStock === 0 || Boolean(selectedCombination && selectedCombination.stock_quantity === 0)
    : stockQuantity === 0;

  return (
    <>
      <ProductStructuredData product={product} />
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

        <div className="grid gap-8 lg:grid-cols-[minmax(280px,0.86fr)_minmax(0,1.14fr)] lg:items-start xl:gap-10">
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
              selectedOptions={selectedOptions}
              onOptionSelect={selectOption}
              currentPrice={currentPrice}
              originalPrice={originalPrice}
              priceAdjustment={priceAdjustment}
              hasDiscount={hasDiscount}
            />

            <ProductDetailActions
              productId={product.id}
              productName={product.name}
              quantity={quantity}
              stockQuantity={stockQuantity}
              isOutOfStock={isOutOfStock}
              requiresVariantSelection={requiresVariantSelection}
              isAddingToCart={isAddingToCart}
              onQuantityIncrease={() => incrementQuantity(stockQuantity)}
              onQuantityDecrease={decrementQuantity}
              onAddToCart={() => {
                if (requiresCombination && !selectedCombination) return;
                void handleAddToCart(product.id, selectedCombination?.id, product.name);
              }}
            />
          </div>
        </div>

        {/* Tabs */}
        <ProductDetailTabs
          productId={product.id}
          description={product.description || ''}
          reviewCount={product.review_count ?? 0}
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
