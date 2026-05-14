'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Minus, Plus, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PLACEHOLDER_PRODUCT_IMAGE } from '@/constants/product.constants';
import { toNum, formatCurrency } from '@/utils';
import { ValidCartItem } from '@/types';

interface CartItemProps {
  item: ValidCartItem;
  isRemoving: boolean;
  isUpdating: boolean;
  onQuantityChange: (itemId: string, newQuantity: number) => void;
  onRemove: (itemId: string) => void;
}

export function CartItem({
  item,
  isRemoving,
  isUpdating,
  onQuantityChange,
  onRemove,
}: CartItemProps) {
  const itemPrice = toNum(item.price);
  const maxStock = item.variant?.stock_quantity ?? item.product.stock_quantity;

  return (
    <motion.div
      key={item.id}
      layout
      data-item-id={item.id}
      className="cart-item"
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Card className="overflow-hidden">
        <CardContent className="p-4">
          <div className="flex gap-4">
            {/* Product Image */}
            <Link
              href={`/products/${item.product.slug}`}
              className="relative w-24 h-24 flex-shrink-0 bg-muted rounded-lg overflow-hidden group"
            >
              <Image
                src={item.product.images?.[0]?.url || PLACEHOLDER_PRODUCT_IMAGE}
                alt={item.product.name}
                fill
                className="object-cover group-hover:scale-110 transition-transform duration-300"
                sizes="96px"
              />
            </Link>

            {/* Product Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    href={`/products/${item.product.slug}`}
                    className="font-semibold hover:text-primary transition-colors line-clamp-1"
                  >
                    {item.product.name}
                  </Link>
                  {item.product.brand && (
                    <p className="text-sm text-muted-foreground">{item.product.brand}</p>
                  )}
                  {item.variant && (
                    <Badge variant="secondary" className="mt-1">
                      {item.variant.variant_type}: {item.variant.variant_value}
                    </Badge>
                  )}
                </div>

                {/* Remove Button */}
                <Button
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0"
                  disabled={isRemoving}
                  onClick={() => onRemove(item.id)}
                >
                  {isRemoving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <X className="h-4 w-4" />
                  )}
                </Button>
              </div>

              <div className="flex items-center justify-between mt-4">
                {/* Quantity Selector */}
                <div className="flex items-center border rounded-lg">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onQuantityChange(item.id, item.quantity - 1)}
                    disabled={item.quantity <= 1 || isUpdating}
                  >
                    <Minus className="h-3 w-3" />
                  </Button>
                  <span className="w-12 text-center text-sm font-medium">
                    {isUpdating ? (
                      <Loader2 className="h-3 w-3 animate-spin mx-auto" />
                    ) : (
                      item.quantity
                    )}
                  </span>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => onQuantityChange(item.id, item.quantity + 1)}
                    disabled={isUpdating || item.quantity >= maxStock}
                  >
                    <Plus className="h-3 w-3" />
                  </Button>
                </div>

                {/* Price */}
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(itemPrice * item.quantity)}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(itemPrice)} each
                  </p>
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
