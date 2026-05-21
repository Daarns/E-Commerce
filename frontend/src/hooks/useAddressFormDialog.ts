import { useState } from 'react';
import type { Address } from '@/types';

const EMPTY_ADDRESS: Partial<Address> = {
  recipient_name: '',
  phone: '',
  street_address: '',
  address_line2: '',
  city: '',
  province: '',
  postal_code: '',
  is_default: false,
};

interface UseAddressFormDialogParams {
  editingAddress: Address | null;
  onSubmit: (data: Partial<Address>) => Promise<void>;
}

interface UseAddressFormDialogReturn {
  formData: Partial<Address>;
  handleChange: (field: keyof Address, value: string | boolean) => void;
  handleSubmit: () => Promise<void>;
}

export function useAddressFormDialog({
  editingAddress,
  onSubmit,
}: UseAddressFormDialogParams): UseAddressFormDialogReturn {
  const [formData, setFormData] = useState<Partial<Address>>(editingAddress || EMPTY_ADDRESS);

  const handleChange = (field: keyof Address, value: string | boolean): void => {
    setFormData((previous) => ({ ...previous, [field]: value }));
  };

  const handleSubmit = async (): Promise<void> => {
    try {
      await onSubmit(formData);
    } catch (error) {
      console.error('Failed to submit address:', error);
    }
  };

  return {
    formData,
    handleChange,
    handleSubmit,
  };
}
