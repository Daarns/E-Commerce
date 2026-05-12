'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/layout';
import { ProductForm } from '@/components/admin/product-form';
import { useProductForm } from '@/hooks/useProductForm';

export default function CreateProductPage() {
  const router = useRouter();
  const { isLoading, handleSubmit } = useProductForm('create');

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Create Product</h1>
            <p className="text-muted-foreground mt-1">
              Add a new product to your catalog
            </p>
          </div>
        </div>

        {/* Form */}
        <Card className="p-6">
          <ProductForm
            mode="create"
            onSubmit={handleSubmit}
            isLoading={isLoading}
          />
        </Card>
      </motion.div>
    </AdminLayout>
  );
}
