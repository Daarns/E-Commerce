'use client';

import { motion } from 'framer-motion';
import { AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useRouter } from 'next/navigation';

interface PaymentErrorProps {
  error: string;
}

export function PaymentError({ error }: PaymentErrorProps) {
  const router = useRouter();

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
      className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100"
    >
      <Card className="w-full max-w-md border-red-200">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center gap-4">
            <AlertCircle className="h-12 w-12 text-red-500" />
            <p className="text-center font-semibold">Payment Error</p>
            <p className="text-center text-muted-foreground text-sm">{error}</p>
            <Button
              onClick={() => router.push('/cart')}
              className="w-full mt-4"
            >
              Back to Cart
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
