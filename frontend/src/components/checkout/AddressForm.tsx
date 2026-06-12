'use client';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';

interface AddressFormData {
  recipient_name: string;
  phone: string;
  street_address: string;
  address_line2: string;
  city: string;
  province: string;
  postal_code: string;
}

interface AddressFormProps {
  isOpen: boolean;
  isEditing: boolean;
  isSaving: boolean;
  formData: AddressFormData;
  onFormChange: (data: AddressFormData) => void;
  onSave: () => Promise<void>;
  onCancel: () => void;
}

export function AddressForm({
  isOpen,
  isEditing,
  isSaving,
  formData,
  onFormChange,
  onSave,
  onCancel,
}: AddressFormProps) {
  if (!isOpen) return null;

  const handleInputChange = (field: keyof AddressFormData, value: string): void => {
    onFormChange({ ...formData, [field]: value });
  };

  return (
    <div>
      <Card>
        <CardContent className="pt-6 space-y-4">
          <p className="text-sm font-semibold text-muted-foreground">
            {isEditing ? 'Edit Alamat' : 'Tambah Alamat Baru'}
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nama Penerima</Label>
              <Input
                placeholder="Nama lengkap"
                value={formData.recipient_name}
                onChange={(e) => handleInputChange('recipient_name', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Nomor Telepon</Label>
              <Input
                placeholder="+62 xxx xxxx xxxx"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Alamat Lengkap</Label>
              <Input
                placeholder="Nama jalan, nomor rumah"
                value={formData.street_address}
                onChange={(e) => handleInputChange('street_address', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Alamat Tambahan (Opsional)</Label>
              <Input
                placeholder="Apartemen, RT/RW, patokan, dll."
                value={formData.address_line2}
                onChange={(e) => handleInputChange('address_line2', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Kota</Label>
              <Input
                placeholder="Kota"
                value={formData.city}
                onChange={(e) => handleInputChange('city', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Provinsi</Label>
              <Input
                placeholder="Provinsi"
                value={formData.province}
                onChange={(e) => handleInputChange('province', e.target.value)}
                disabled={isSaving}
              />
            </div>

            <div className="space-y-2">
              <Label>Kode Pos</Label>
              <Input
                placeholder="Kode pos"
                value={formData.postal_code}
                onChange={(e) => handleInputChange('postal_code', e.target.value)}
                disabled={isSaving}
              />
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <Button onClick={onSave} disabled={isSaving}>
              {isSaving
                ? 'Menyimpan...'
                : isEditing
                  ? 'Simpan Perubahan'
                  : 'Simpan Alamat'}
            </Button>
            <Button variant="outline" onClick={onCancel} disabled={isSaving}>
              Batal
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
