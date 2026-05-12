import { useEffect, useCallback, useState } from 'react';
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
  const productId = params.id as string;

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const loadProduct = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      const response = await adminProductService.getProduct(productId);
      setProduct(response.data);
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
      try {
        setIsUpdating(true);
        const updateData: UpdateProductRequest = {
          ...data,
          id: productId,
          version: product?.version ?? 0,
        };
        await adminProductService.updateProduct(productId, updateData);
        toast.success('Product updated successfully');
        await loadProduct();
      } catch (error) {
        handleError(error, { context: 'Failed to update product' });
      } finally {
        setIsUpdating(false);
      }
    },
    [productId, product?.version, loadProduct]
  );

  const handleDelete = useCallback(async (): Promise<void> => {
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
