import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { adminProductService, CreateProductRequest, UpdateProductRequest, AdminProduct } from '@/services/admin';
import { handleError } from '@/utils/error-handler';

interface UseProductFormReturn {
  isLoading: boolean;
  handleSubmit: (data: CreateProductRequest | UpdateProductRequest) => Promise<void>;
}

export function useProductForm(mode: 'create' | 'edit'): UseProductFormReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (data: CreateProductRequest | UpdateProductRequest): Promise<void> => {
      try {
        setIsLoading(true);

        let response: AdminProduct;
        if (mode === 'create') {
          response = await adminProductService.createProduct(data as CreateProductRequest);
        } else {
          response = await adminProductService.updateProduct(
            (data as UpdateProductRequest).id,
            data as UpdateProductRequest
          );
        }

        toast.success(
          mode === 'create' ? 'Product created successfully' : 'Product updated successfully'
        );
        router.push(`/admin/products/${response.id}`);
      } catch (error) {
        handleError(error, { context: `Failed to ${mode} product` });
      } finally {
        setIsLoading(false);
      }
    },
    [mode, router]
  );

  return { isLoading, handleSubmit };
}
