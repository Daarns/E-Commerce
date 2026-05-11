'use client';

import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export function PaymentLoading() {
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
      <Card className="w-full max-w-md">
        <CardContent className="pt-12 pb-12">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading payment gateway...</p>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
