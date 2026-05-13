'use client';

import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { ProductForm } from '@/components/admin/product/product-form';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useProductEdit } from '@/hooks/useProductEdit';

export default function EditProductPage() {
  const router = useRouter();
  const {
    product,
    isLoading,
    isUpdating,
    isDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleSubmit,
    handleDelete,
  } = useProductEdit();

  if (isLoading) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <Loader2 className="w-8 h-8 animate-spin text-muted-foreground" />
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <p className="text-muted-foreground">Product not found</p>
          </div>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => router.back()}
            >
              <ArrowLeft className="w-4 h-4" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold">Edit Product</h1>
              <p className="text-muted-foreground mt-1">{product.name}</p>
            </div>
          </div>

          <Button
            variant="destructive"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Delete Product
          </Button>
        </div>

        {/* Form */}
        <Card className="p-6">
          <ProductForm
            mode="edit"
            product={product}
            onSubmit={handleSubmit}
            isLoading={isUpdating}
          />
        </Card>
      </motion.div>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{product.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowDeleteConfirm(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminLayout>
  );
}
