'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { useAddressFormDialog } from '@/hooks/useAddressFormDialog';
import { Address } from '@/types';

interface AddressFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingAddress: Address | null;
  onSubmit: (data: Partial<Address>) => Promise<void>;
  isLoading: boolean;
}

export function AddressFormDialog({
  open,
  onOpenChange,
  editingAddress,
  onSubmit,
  isLoading,
}: AddressFormDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>
            {editingAddress ? 'Edit Address' : 'Add New Address'}
          </DialogTitle>
        </DialogHeader>
        <AddressFormContent
          key={editingAddress?.id ?? 'new-address'}
          editingAddress={editingAddress}
          onSubmit={onSubmit}
          isLoading={isLoading}
          onClose={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

interface AddressFormContentProps {
  editingAddress: Address | null;
  onSubmit: (data: Partial<Address>) => Promise<void>;
  isLoading: boolean;
  onClose: () => void;
}

function AddressFormContent({
  editingAddress,
  onSubmit,
  isLoading,
  onClose,
}: AddressFormContentProps) {
  const { formData, handleChange, handleSubmit } = useAddressFormDialog({
    editingAddress,
    onSubmit,
  });

  return (
    <>
      <div className="space-y-4 py-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="recipient_name">Recipient Name</Label>
            <Input
              id="recipient_name"
              value={formData.recipient_name || ''}
              onChange={e => handleChange('recipient_name', e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={formData.phone || ''}
              onChange={e => handleChange('phone', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="street_address">
            Street Address <span className="text-red-500">*</span>
          </Label>
          <Input
            id="street_address"
            placeholder="Jl. Sudirman No. 123"
            value={formData.street_address || ''}
            onChange={e => handleChange('street_address', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="address_line2">
            Address Line 2 <span className="text-xs text-muted-foreground">(optional)</span>
          </Label>
          <Input
            id="address_line2"
            placeholder="Apt, Suite, Floor, Building, etc."
            value={formData.address_line2 || ''}
            onChange={e => handleChange('address_line2', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="city">
              City <span className="text-red-500">*</span>
            </Label>
            <Input
              id="city"
              placeholder="Jakarta Selatan"
              value={formData.city || ''}
              onChange={e => handleChange('city', e.target.value)}
              disabled={isLoading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="province">
              Province <span className="text-red-500">*</span>
            </Label>
            <Input
              id="province"
              placeholder="DKI Jakarta"
              value={formData.province || ''}
              onChange={e => handleChange('province', e.target.value)}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="postal_code">
            Postal Code <span className="text-red-500">*</span>
          </Label>
          <Input
            id="postal_code"
            placeholder="12190"
            value={formData.postal_code || ''}
            onChange={e => handleChange('postal_code', e.target.value)}
            disabled={isLoading}
          />
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.is_default || false}
            onChange={e => handleChange('is_default', e.target.checked)}
            className="w-4 h-4 rounded border-gray-300"
            disabled={isLoading}
          />
          <span>Set as default address</span>
        </label>
      </div>

      <DialogFooter>
        <Button
          variant="ghost"
          disabled={isLoading}
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button onClick={() => void handleSubmit()} disabled={isLoading}>
          {isLoading ? (
            <span className="flex items-center gap-2">
              <span className="h-3.5 w-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              Saving...
            </span>
          ) : (
            <>{editingAddress ? 'Update' : 'Add'} Address</>
          )}
        </Button>
      </DialogFooter>
    </>
  );
}
