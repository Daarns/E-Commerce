import { useCallback, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  adminProductService,
  CreateProductRequest,
  CreateVariantInput,
  UpdateProductRequest,
  AdminProduct,
} from '@/services/admin';
import { handleError } from '@/utils/error-handler';

interface UseProductFormReturn {
  isLoading: boolean;
  handleSubmit: (
    data: CreateProductRequest | UpdateProductRequest,
    variants?: CreateVariantInput[]
  ) => Promise<void>;
}

export function useProductForm(mode: 'create' | 'edit'): UseProductFormReturn {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = useCallback(
    async (
      data: CreateProductRequest | UpdateProductRequest,
      variants: CreateVariantInput[] = []
    ): Promise<void> => {
      try {
        setIsLoading(true);

        let response: AdminProduct;
        if (mode === 'create') {
          if (isUpdateProductRequest(data)) {
            throw new Error('Invalid product create payload');
          }
          response = await adminProductService.createProduct(data);
          await Promise.all(
            variants.map((variant) => adminProductService.addProductVariant(response.id, variant))
          );
        } else {
          if (!isUpdateProductRequest(data)) {
            throw new Error('Invalid product update payload');
          }
          response = await adminProductService.updateProduct(data.id, data);
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

function isUpdateProductRequest(
  data: CreateProductRequest | UpdateProductRequest
): data is UpdateProductRequest {
  return 'id' in data && typeof data.id === 'string';
}
