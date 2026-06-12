'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Edit2, Trash2, Loader2 } from 'lucide-react';
import { Address } from '@/types';

interface AddressListProps {
  addresses: Address[];
  selectedAddress: string;
  deletingAddressId: string | null;
  onSelectAddress: (id: string) => void;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
}

export function AddressList({
  addresses,
  selectedAddress,
  deletingAddressId,
  onSelectAddress,
  onEdit,
  onDelete,
}: AddressListProps) {
  if (addresses.length === 0) {
    return (
      <div className="text-center py-8 border-2 border-dashed border-border rounded-lg">
        <MapPin className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">Belum ada alamat tersimpan.</p>
        <p className="text-xs text-muted-foreground mt-1">Tambahkan alamat pengiriman di atas.</p>
      </div>
    );
  }

  return (
    <RadioGroup
      value={selectedAddress}
      onValueChange={(value) => onSelectAddress(String(value))}
    >
      <div className="space-y-4">
        {addresses.map((address) => (
          <div
            key={address.id}
            className={`relative p-4 rounded-lg border-2 cursor-pointer transition-colors ${
              selectedAddress === address.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50'
            }`}
            onClick={() => onSelectAddress(address.id)}
          >
            <div className="flex items-start gap-4">
              <RadioGroupItem value={address.id} id={address.id} className="mt-1" />
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <p className="text-sm font-semibold">{address.recipient_name}</p>
                  {address.is_default && (
                    <Badge variant="secondary" className="text-xs">
                      Default
                    </Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground">{address.phone}</p>
                <p className="text-sm text-muted-foreground mt-1">
                  {address.street_address}
                  {address.address_line2 && `, ${address.address_line2}`}
                </p>
                <p className="text-sm text-muted-foreground">
                  {address.city}, {address.province} {address.postal_code}
                </p>
              </div>
              <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => onEdit(address)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => onDelete(address.id)}
                  disabled={deletingAddressId === address.id}
                >
                  {deletingAddressId === address.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
            {deletingAddressId === address.id && (
              <p className="text-xs text-muted-foreground mt-2 ml-8">Menghapus alamat...</p>
            )}
          </div>
        ))}
      </div>
    </RadioGroup>
  );
}
