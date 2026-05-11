import { Star } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { VariantSelector } from '@/components/product/variant-selector';
import { Product, ProductVariant } from '@/types';
import { formatCurrency } from '@/utils';

interface ProductDetailInfoProps {
  product: Product;
  selectedVariant: ProductVariant | null;
  onVariantSelect: (variant: ProductVariant) => void;
  currentPrice: number;
  originalPrice: number;
  stockQuantity: number;
}

export function ProductDetailInfo({
  product,
  selectedVariant,
  onVariantSelect,
  currentPrice,
  originalPrice,
  stockQuantity,
}: ProductDetailInfoProps) {
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
          variants={product.variants.map((v) => ({
            id: v.id,
            type: v.variant_type,
            value: v.variant_value,
            price_adjustment: v.price_adjustment,
            stock_quantity: v.stock_quantity,
            image_url: v.image_url,
          }))}
          selectedVariant={
            selectedVariant
              ? {
                  id: selectedVariant.id,
                  type: selectedVariant.variant_type,
                  value: selectedVariant.variant_value,
                  price_adjustment: selectedVariant.price_adjustment,
                  stock_quantity: selectedVariant.stock_quantity,
                  image_url: selectedVariant.image_url,
                }
              : null
          }
          onSelect={(v) => {
            const variant = product.variants?.find((pv) => pv.id === v.id);
            if (variant) onVariantSelect(variant);
          }}
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
