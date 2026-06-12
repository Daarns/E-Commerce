import { useEffect, useState } from 'react';
import { Address } from '@/types';
import { addressService } from '@/services/address';
import { toast } from 'sonner';

export function useAddresses(initialAddresses: Address[]) {
  const [addresses, setAddresses] = useState<Address[]>(initialAddresses);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    setAddresses(initialAddresses);
  }, [initialAddresses]);

  const handleAddAddress = async (data: Partial<Address>) => {
    setIsLoading(true);
    try {
      const created = await addressService.createAddress(data);

      if (data.is_default) {
        setAddresses(prev => [
          ...prev.map(a => ({ ...a, is_default: false })),
          created,
        ]);
      } else {
        setAddresses(prev => [...prev, created]);
      }

      toast.success('Address added successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to add address';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditAddress = async (id: string, data: Partial<Address>) => {
    setIsLoading(true);
    try {
      const updated = await addressService.updateAddress(id, data);

      setAddresses(prev =>
        prev.map(a => {
          if (a.id === updated.id) {
            return updated;
          }
          // If setting new address as default, unset others
          if (data.is_default && a.is_default) {
            return { ...a, is_default: false };
          }
          return a;
        })
      );

      toast.success('Address updated successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update address';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAddress = async (id: string) => {
    setIsLoading(true);
    try {
      await addressService.deleteAddress(id);
      setAddresses(prev => prev.filter(a => a.id !== id));
      toast.success('Address deleted successfully');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to delete address';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetDefault = async (id: string) => {
    setIsLoading(true);
    try {
      await addressService.setDefault(id);
      setAddresses(prev => prev.map(a => ({ ...a, is_default: a.id === id })));
      toast.success('Default address updated');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Failed to update default address';
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    addresses,
    isLoading,
    handleAddAddress,
    handleEditAddress,
    handleDeleteAddress,
    handleSetDefault,
  };
}
