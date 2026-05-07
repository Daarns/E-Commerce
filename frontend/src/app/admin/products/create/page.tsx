'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/layout';
import { ProductForm } from '@/components/admin/product-form';
import { adminService, CreateProductRequest } from '@/services/admin';
import { toast } from 'sonner';

export default function CreateProductPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (data: CreateProductRequest & { id?: string }) => {
    try {
      setIsLoading(true);
      const response = await adminService.createProduct(data);
      toast.success('Product created successfully');
      router.push(`/admin/products/${response.data.id}`);
    } catch (error) {
      console.error('Failed to create product:', error);
      toast.error(
        error instanceof Error ? error.message : 'Failed to create product'
      );
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

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
