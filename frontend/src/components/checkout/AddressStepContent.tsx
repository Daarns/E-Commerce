'use client';

import { motion, AnimatePresence } from 'framer-motion';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AddressForm } from './AddressForm';
import { AddressList } from './AddressList';
import { Address } from '@/types';

interface AddressFormData {
  recipient_name: string;
  phone: string;
  street_address: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
}

interface AddressStepContentProps {
  addresses: Address[];
  selectedAddress: string;
  isLoading: boolean;
  error: string | null;
  showForm: boolean;
  isEditing: boolean;
  formData: AddressFormData;
  isSaving: boolean;
  deletingAddressId: string | null;
  onSelectedAddressChange: (id: string) => void;
  onShowFormChange: (show: boolean) => void;
  onFormChange: (data: AddressFormData) => void;
  onSave: () => Promise<void>;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => Promise<void>;
  onReload: () => Promise<void>;
}

const stepVariants = {
  hidden: { opacity: 0, x: 50 },
  visible: { opacity: 1, x: 0 },
  exit: { opacity: 0, x: -50 },
};

export function AddressStepContent({
  addresses,
  selectedAddress,
  isLoading,
  error,
  showForm,
  isEditing,
  formData,
  isSaving,
  deletingAddressId,
  onSelectedAddressChange,
  onShowFormChange,
  onFormChange,
  onSave,
  onEdit,
  onDelete,
  onReload,
}: AddressStepContentProps) {
  return (
    <motion.div
      variants={stepVariants}
      initial="hidden"
      animate="visible"
      exit="exit"
      transition={{ duration: 0.3 }}
      className="space-y-6"
    >
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Shipping Address</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            onFormChange({
              recipient_name: '',
              phone: '',
              street_address: '',
              address_line2: '',
              city: '',
              province: '',
              postal_code: '',
            });
            onShowFormChange(!showForm);
          }}
        >
          <Plus className="h-4 w-4 mr-2" />
          Add New
        </Button>
      </div>

      {/* Add / Edit Address Form */}
      <AnimatePresence>
        <AddressForm
          isOpen={showForm}
          isEditing={isEditing}
          isSaving={isSaving}
          formData={formData}
          onFormChange={onFormChange}
          onSave={onSave}
          onCancel={() => {
            onShowFormChange(false);
            onFormChange({
              recipient_name: '',
              phone: '',
              street_address: '',
              address_line2: '',
              city: '',
              province: '',
              postal_code: '',
            });
          }}
        />
      </AnimatePresence>

      {/* Loading Skeleton */}
      {isLoading && (
        <div className="space-y-4">
          {[1, 2].map((i) => (
            <div key={i} className="p-4 rounded-lg border-2 border-border animate-pulse">
              <div className="flex items-start gap-4">
                <div className="h-4 w-4 rounded-full bg-muted mt-1" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-1/3 bg-muted rounded" />
                  <div className="h-3 w-1/4 bg-muted rounded" />
                  <div className="h-3 w-2/3 bg-muted rounded" />
                  <div className="h-3 w-1/2 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="text-center py-6 space-y-3">
          <p className="text-sm text-destructive">{error}</p>
          <Button variant="outline" size="sm" onClick={onReload}>
            Coba Lagi
          </Button>
        </div>
      )}

      {/* Address List */}
      {!isLoading && !error && (
        <AddressList
          addresses={addresses}
          selectedAddress={selectedAddress}
          deletingAddressId={deletingAddressId}
          onSelectAddress={onSelectedAddressChange}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      )}
    </motion.div>
  );
}
