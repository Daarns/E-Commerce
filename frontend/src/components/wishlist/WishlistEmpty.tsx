'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WishlistEmpty() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-20 space-y-6"
    >
      <Heart className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
      <div>
        <h2 className="text-2xl font-bold mb-2">Your wishlist is empty</h2>
        <p className="text-muted-foreground mb-6">
          Add items to your wishlist as you explore
        </p>
      </div>
      <Button asChild size="lg">
        <Link href="/products">Browse Products</Link>
      </Button>
    </motion.div>
  );
}
