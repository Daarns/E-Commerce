'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { ProductCard } from '@/components/product/product-card';
import { Product } from '@/types';

interface WishlistContentProps {
  products: Product[];
}

export function WishlistContent({ products }: WishlistContentProps) {
  return (
    <>
      <motion.div
        layout
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
      >
        {products.map((product, index) => (
          <ProductCard key={product.id} product={product} index={index} />
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="flex justify-center gap-4 pt-8"
      >
        <Button asChild variant="outline">
          <Link href="/products">Continue Shopping</Link>
        </Button>
        <Button asChild>
          <Link href="/cart">View Cart</Link>
        </Button>
      </motion.div>
    </>
  );
}
