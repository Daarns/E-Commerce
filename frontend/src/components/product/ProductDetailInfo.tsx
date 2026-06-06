import { Separator } from '@/components/ui/separator';
import { VariantSelector } from '@/components/product/variant-selector';
import { ReviewStars } from '@/components/product/review-stars';
import { Product } from '@/types';
import { formatCurrency } from '@/utils';

interface ProductDetailInfoProps {
  product: Product;
  selectedOptions: Record<string, string>;
  onOptionSelect: (typeId: string, optionId: string) => void;
  currentPrice: number;
  originalPrice: number;
  priceAdjustment: number;
  hasDiscount: boolean;
}

export function ProductDetailInfo({
  product,
  selectedOptions,
  onOptionSelect,
  currentPrice,
  originalPrice,
  priceAdjustment,
  hasDiscount,
}: ProductDetailInfoProps) {
  const hasVariantAdjustment = priceAdjustment > 0;
  const averageRating = product.avg_rating ?? 0;
  const reviewCount = product.review_count ?? 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        {product.brand && (
          <p className="text-sm text-muted-foreground mb-1">{product.brand}</p>
        )}
        <h1 className="text-3xl font-bold mb-2">{product.name}</h1>

        {/* Rating */}
        <div className="flex items-center gap-2">
          <ReviewStars rating={averageRating} />
          <span className="text-sm text-muted-foreground">
            {averageRating.toFixed(1)} ({reviewCount} review)
          </span>
        </div>
      </div>

      {/* Price */}
      <div className="space-y-1">
        <div className="flex items-baseline gap-3">
          <span className="text-3xl font-bold">{formatCurrency(currentPrice)}</span>
          {hasDiscount && originalPrice > currentPrice && (
            <span className="text-xl text-muted-foreground line-through">
              {formatCurrency(originalPrice)}
            </span>
          )}
        </div>
        {hasVariantAdjustment && (
          <p className="text-sm text-muted-foreground">
            Includes variant adjustment +{formatCurrency(priceAdjustment)}
          </p>
        )}
      </div>

      {/* Short Description */}
      {product.short_description && (
        <p className="text-muted-foreground">{product.short_description}</p>
      )}

      <Separator />

      {/* Variants */}
      {product.variant_types && product.variant_types.length > 0 && product.combinations && product.combinations.length > 0 && (
        <VariantSelector
          variantTypes={product.variant_types}
          combinations={product.combinations}
          selectedOptions={selectedOptions}
          onSelect={onOptionSelect}
        />
      )}

      {/* SKU & Category */}
      <div className="text-sm text-muted-foreground space-y-1">
        {product.sku && <p>SKU: {product.sku}</p>}
        {product.category && <p>Category: {product.category.name}</p>}
      </div>
    </div>
  );
}
