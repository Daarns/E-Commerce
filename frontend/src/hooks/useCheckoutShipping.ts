import { useCallback, useState } from 'react';
import { shippingService, type ShippingMethod } from '@/services/shipping';

export function useCheckoutShipping() {
  const [shippingMethods, setShippingMethods] = useState<ShippingMethod[]>([]);
  const [selectedShipping, setSelectedShipping] = useState<string>('regular');
  const [isLoadingShipping, setIsLoadingShipping] = useState(false);
  const [shippingError, setShippingError] = useState<string | null>(null);

  const loadShippingMethods = useCallback(async (): Promise<void> => {
    setIsLoadingShipping(true);
    setShippingError(null);
    try {
      const data = await shippingService.getMethods();
      setShippingMethods(data);
      if (data.length > 0) {
        setSelectedShipping(data[0].code);
      }
    } catch {
      setShippingError('Gagal memuat opsi pengiriman. Silakan coba lagi.');
    } finally {
      setIsLoadingShipping(false);
    }
  }, []);

  const getSelectedMethod = useCallback((): ShippingMethod | undefined => {
    return shippingMethods.find((s) => s.code === selectedShipping);
  }, [selectedShipping, shippingMethods]);

  const getShippingCost = useCallback((): number => {
    return getSelectedMethod()?.price ?? 0;
  }, [getSelectedMethod]);

  return {
    shippingMethods,
    selectedShipping,
    setSelectedShipping,
    isLoadingShipping,
    shippingError,
    loadShippingMethods,
    getSelectedMethod,
    getShippingCost,
  };
}
