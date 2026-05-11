'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function WishlistNotAuthenticated() {
  return (
    <div className="container mx-auto px-4 py-20">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center space-y-6"
      >
        <Heart className="h-16 w-16 mx-auto text-muted-foreground opacity-50" />
        <div>
          <h1 className="text-3xl font-bold mb-2">Your Wishlist</h1>
          <p className="text-muted-foreground mb-6">
            Sign in to save your favorite items
          </p>
        </div>
        <Button asChild size="lg">
          <Link href="/login">Sign In</Link>
        </Button>
      </motion.div>
    </div>
  );
}
