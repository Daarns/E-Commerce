import { Button } from '@/components/ui/button';
import { WishlistButton } from '@/components/product/wishlist-button';
import { OUT_OF_STOCK_LABEL } from '@/constants/product.constants';
import { Minus, Plus, ShoppingBag, Share2, Truck, Shield, RefreshCcw } from 'lucide-react';

interface ProductDetailActionsProps {
  productId: string;
  productName: string;
  quantity: number;
  stockQuantity: number;
  isOutOfStock: boolean;
  isAddingToCart: boolean;
  onQuantityIncrease: () => void;
  onQuantityDecrease: () => void;
  onAddToCart: () => void;
}

export function ProductDetailActions({
  productId,
  quantity,
  stockQuantity,
  isOutOfStock,
  isAddingToCart,
  onQuantityIncrease,
  onQuantityDecrease,
  onAddToCart,
}: ProductDetailActionsProps) {
  return (
    <>
      {/* Quantity */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Quantity</label>
        <div className="flex items-center gap-3">
          <div className="flex items-center border rounded-lg">
            <Button
              variant="ghost"
              size="icon"
              onClick={onQuantityDecrease}
              disabled={quantity <= 1}
            >
              <Minus className="h-4 w-4" />
            </Button>
            <span className="w-12 text-center font-medium">{quantity}</span>
            <Button
              variant="ghost"
              size="icon"
              onClick={onQuantityIncrease}
              disabled={quantity >= stockQuantity}
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>
          {stockQuantity > 0 && stockQuantity < 10 && (
            <span className="text-sm text-orange-500">Only {stockQuantity} left in stock</span>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3">
        <Button
          className="flex-1 gap-2"
          size="lg"
          onClick={onAddToCart}
          disabled={isOutOfStock || isAddingToCart}
        >
          <ShoppingBag className="h-5 w-5" />
          {isAddingToCart ? 'Adding...' : isOutOfStock ? OUT_OF_STOCK_LABEL : 'Add to Cart'}
        </Button>
        <WishlistButton productId={productId} size="lg" />
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
    </>
  );
}
