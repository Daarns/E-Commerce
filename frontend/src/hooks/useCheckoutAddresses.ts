import { useCallback, useState } from 'react';
import { Address } from '@/types';
import { addressService } from '@/services/address';

interface AddressFormData {
  recipient_name: string;
  phone: string;
  street_address: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
}

const INITIAL_FORM_STATE: AddressFormData = {
  recipient_name: '',
  phone: '',
  street_address: '',
  address_line2: '',
  city: '',
  province: '',
  postal_code: '',
};

export function useCheckoutAddresses() {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [selectedAddress, setSelectedAddress] = useState<string>('');
  const [isLoadingAddresses, setIsLoadingAddresses] = useState(true);
  const [addressError, setAddressError] = useState<string | null>(null);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [formData, setFormData] = useState<AddressFormData>(INITIAL_FORM_STATE);
  const [isSavingAddress, setIsSavingAddress] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);

  const loadAddresses = useCallback(async (): Promise<void> => {
    setIsLoadingAddresses(true);
    setAddressError(null);
    try {
      const data = await addressService.getAddresses();
      setAddresses(data);
      setSelectedAddress((current) => {
        if (current) return current;
        const defaultAddr = data.find((a) => a.is_default);
        return defaultAddr?.id ?? current;
      });
    } catch {
      setAddressError('Gagal memuat alamat. Silakan coba lagi.');
    } finally {
      setIsLoadingAddresses(false);
    }
  }, []);

  const resetForm = (): void => {
    setFormData(INITIAL_FORM_STATE);
    setEditingAddress(null);
    setShowAddressForm(false);
  };

  const openEdit = (address: Address): void => {
    setEditingAddress(address);
    setFormData({
      recipient_name: address.recipient_name,
      phone: address.phone,
      street_address: address.street_address,
      address_line2: address.address_line2 ?? '',
      city: address.city,
      province: address.province,
      postal_code: address.postal_code,
    });
    setShowAddressForm(true);
  };

  const saveAddress = async (): Promise<void> => {
    setIsSavingAddress(true);
    try {
      if (editingAddress) {
        const updated = await addressService.updateAddress(editingAddress.id, formData);
        setAddresses((prev) => prev.map((a) => (a.id === updated.id ? updated : a)));
      } else {
        const created = await addressService.createAddress({
          ...formData,
          is_default: addresses.length === 0,
        });
        setAddresses((prev) => [...prev, created]);
        setSelectedAddress(created.id);
      }
      resetForm();
    } catch {
      throw new Error('Gagal menyimpan alamat. Silakan coba lagi.');
    } finally {
      setIsSavingAddress(false);
    }
  };

  const deleteAddress = async (id: string): Promise<void> => {
    setDeletingAddressId(id);
    try {
      await addressService.deleteAddress(id);
      setAddresses((prev) => prev.filter((a) => a.id !== id));
      if (selectedAddress === id) setSelectedAddress('');
    } catch {
      throw new Error('Gagal menghapus alamat. Silakan coba lagi.');
    } finally {
      setDeletingAddressId(null);
    }
  };

  return {
    addresses,
    selectedAddress,
    setSelectedAddress,
    isLoadingAddresses,
    addressError,
    showAddressForm,
    setShowAddressForm,
    editingAddress,
    formData,
    setFormData,
    isSavingAddress,
    deletingAddressId,
    loadAddresses,
    resetForm,
    openEdit,
    saveAddress,
    deleteAddress,
  };
}
