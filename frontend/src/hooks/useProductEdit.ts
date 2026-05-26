import { useEffect, useCallback, useState, useRef } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { toast } from 'sonner';
import { adminProductService, CreateProductRequest, UpdateProductRequest, AdminProduct } from '@/services/admin';
import { handleError } from '@/utils/error-handler';

interface UseProductEditReturn {
  product: AdminProduct | null;
  isLoading: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
  showDeleteConfirm: boolean;
  setShowDeleteConfirm: (show: boolean) => void;
  handleSubmit: (data: CreateProductRequest | UpdateProductRequest) => Promise<void>;
  handleDelete: () => Promise<void>;
}

export function useProductEdit(): UseProductEditReturn {
  const router = useRouter();
  const params = useParams();
  const productId = typeof params.id === 'string' ? params.id : '';

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  // Track latest version via ref to avoid stale closure in handleSubmit
  const latestVersionRef = useRef(0);

  useEffect(() => {
    latestVersionRef.current = product?.version ?? 0;
  }, [product?.version]);

  const loadProduct = useCallback(async (): Promise<void> => {
    if (!productId) {
      router.push('/admin/products');
      return;
    }

    try {
      setIsLoading(true);
      const response = await adminProductService.getProduct(productId);
      setProduct(response.data);
      // Immediately sync version ref so it's available before React re-renders
      latestVersionRef.current = response.data.version ?? 0;
    } catch (error) {
      handleError(error, { context: 'Failed to load product' });
      router.push('/admin/products');
    } finally {
      setIsLoading(false);
    }
  }, [productId, router]);

  useEffect(() => {
    loadProduct();
  }, [loadProduct]);

  const handleSubmit = useCallback(
    async (data: CreateProductRequest | UpdateProductRequest): Promise<void> => {
      if (!productId) return;

      try {
        setIsUpdating(true);
        const updateData: UpdateProductRequest = {
          ...data,
          id: productId,
          version: latestVersionRef.current,
        };
        const updatedProduct = await adminProductService.updateProduct(productId, updateData);
        // Immediately sync version from server response (synchronous, no React render needed)
        if (updatedProduct?.version != null) {
          latestVersionRef.current = updatedProduct.version;
        }
        toast.success('Product updated successfully');
        router.replace('/admin/products');
      } catch (error) {
        handleError(error, { context: 'Failed to update product' });
        // Refresh product from DB so the version ref stays in sync
        // (safety net in case the failed save left DB in an unexpected state)
        await loadProduct();
      } finally {
        setIsUpdating(false);
      }
    },
    [productId, loadProduct, router]
  );

  const handleDelete = useCallback(async (): Promise<void> => {
    if (!productId) return;

    try {
      setIsDeleting(true);
      await adminProductService.deleteProduct(productId);
      toast.success('Product deleted successfully');
      router.push('/admin/products');
    } catch (error) {
      handleError(error, { context: 'Failed to delete product' });
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  }, [productId, router]);

  return {
    product,
    isLoading,
    isUpdating,
    isDeleting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    handleSubmit,
    handleDelete,
  };
}
