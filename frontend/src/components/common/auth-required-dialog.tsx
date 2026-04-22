'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, ShoppingCart, Heart, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface AuthRequiredDialogProps {
  open: boolean;
  onClose: () => void;
  /** 'cart' | 'wishlist' — changes icon and copy */
  feature?: 'cart' | 'wishlist';
  /** Optional page to redirect back to after login */
  redirectAfter?: string;
}

export function AuthRequiredDialog({
  open,
  onClose,
  feature = 'cart',
  redirectAfter,
}: AuthRequiredDialogProps) {
  const router = useRouter();

  const copy = {
    cart: {
      icon: <ShoppingCart className="h-10 w-10 text-primary" />,
      title: 'Sign in to add to cart',
      description: 'You need to be logged in to add items to your cart and proceed to checkout.',
    },
    wishlist: {
      icon: <Heart className="h-10 w-10 text-rose-500" />,
      title: 'Sign in to save to wishlist',
      description: 'You need to be logged in to save items to your wishlist.',
    },
  }[feature];

  const handleLogin = () => {
    onClose();
    const loginUrl = redirectAfter
      ? `/login?redirect=${encodeURIComponent(redirectAfter)}`
      : '/login';
    router.push(loginUrl);
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        // Backdrop
        <motion.div
          key="auth-dialog-backdrop"
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          {/* Dialog panel */}
          <motion.div
            key="auth-dialog-panel"
            className="relative w-full max-w-sm bg-background rounded-2xl shadow-2xl p-6 flex flex-col items-center gap-4 text-center"
            initial={{ opacity: 0, scale: 0.9, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 16 }}
            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              className="absolute top-3 right-3 rounded-full p-1 text-muted-foreground hover:bg-muted transition-colors"
              onClick={onClose}
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Icon */}
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-muted">
              {copy.icon}
            </div>

            {/* Text */}
            <div className="space-y-1">
              <h2 className="text-lg font-semibold">{copy.title}</h2>
              <p className="text-sm text-muted-foreground">{copy.description}</p>
            </div>

            {/* Actions */}
            <div className="flex w-full flex-col gap-2 pt-1">
              <Button className="w-full gap-2" onClick={handleLogin}>
                <LogIn className="h-4 w-4" />
                Sign In
              </Button>
              <Button variant="ghost" className="w-full text-sm" onClick={onClose}>
                Continue Browsing
              </Button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
