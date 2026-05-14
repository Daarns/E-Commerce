import { useState } from 'react';
import type { Address } from '@/types';

interface UseAddressesTabParams {
  onAddAddress: (data: Partial<Address>) => Promise<void>;
  onEditAddress: (id: string, data: Partial<Address>) => Promise<void>;
  onDeleteAddress: (id: string) => Promise<void>;
}

interface UseAddressesTabReturn {
  showAddressModal: boolean;
  editingAddress: Address | null;
  showDeleteConfirm: string | null;
  setShowAddressModal: (open: boolean) => void;
  setShowDeleteConfirm: (id: string | null) => void;
  handleAddNew: () => void;
  handleEdit: (address: Address) => void;
  handleDelete: (id: string) => Promise<void>;
  handleSubmitAddress: (data: Partial<Address>) => Promise<void>;
}

export function useAddressesTab({
  onAddAddress,
  onEditAddress,
  onDeleteAddress,
}: UseAddressesTabParams): UseAddressesTabReturn {
  const [showAddressModal, setShowAddressModal] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const handleAddNew = (): void => {
    setEditingAddress(null);
    setShowAddressModal(true);
  };

  const handleEdit = (address: Address): void => {
    setEditingAddress(address);
    setShowAddressModal(true);
  };

  const handleDelete = async (id: string): Promise<void> => {
    try {
      await onDeleteAddress(id);
      setShowDeleteConfirm(null);
    } catch (error) {
      console.error('Failed to delete address:', error);
    }
  };

  const handleSubmitAddress = async (data: Partial<Address>): Promise<void> => {
    if (editingAddress) {
      await onEditAddress(editingAddress.id, data);
    } else {
      await onAddAddress(data);
    }
    setShowAddressModal(false);
    setEditingAddress(null);
  };

  return {
    showAddressModal,
    editingAddress,
    showDeleteConfirm,
    setShowAddressModal,
    setShowDeleteConfirm,
    handleAddNew,
    handleEdit,
    handleDelete,
    handleSubmitAddress,
  };
}
