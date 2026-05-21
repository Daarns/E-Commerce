'use client';

import { motion } from 'framer-motion';
import { CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function PaymentSuccess() {
  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.3 },
    },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-50"
    >
      <Card className="w-full max-w-md border-green-200">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center gap-4">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 200 }}
            >
              <CheckCircle className="h-12 w-12 text-green-500" />
            </motion.div>
            <p className="text-center font-semibold text-lg">Payment Successful!</p>
            <p className="text-center text-muted-foreground">
              Your order has been confirmed. Redirecting to order details...
            </p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
