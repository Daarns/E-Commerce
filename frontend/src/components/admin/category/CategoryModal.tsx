'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { AdminCategoryFormData } from '@/hooks/useAdminCategories';
import type { Category } from '@/types';

interface CategoryModalProps {
  open: boolean;
  isEdit: boolean;
  isSaving: boolean;
  formData: AdminCategoryFormData;
  parentOptions: Category[];
  error: string | null;
  onClose: () => void;
  onSave: () => Promise<void>;
  onFieldChange: <K extends keyof AdminCategoryFormData>(field: K, value: AdminCategoryFormData[K]) => void;
}

export function CategoryModal({
  open,
  isEdit,
  isSaving,
  formData,
  parentOptions,
  error,
  onClose,
  onSave,
  onFieldChange,
}: CategoryModalProps) {
  const selectedParent = parentOptions.find((category) => category.id === formData.parent_id);

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Kategori' : 'Tambah Kategori'}</DialogTitle>
          <DialogDescription>
            Kelola kategori katalog tanpa keluar dari area product management.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="category-name">
              Nama Kategori <span className="text-red-500">*</span>
            </Label>
            <Input
              id="category-name"
              value={formData.name}
              onChange={(event) => onFieldChange('name', event.target.value)}
              placeholder="Contoh: Smartphones"
              disabled={isSaving}
              className={error ? 'border-red-500' : undefined}
            />
            {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
          </div>

          <div>
            <Label htmlFor="category-description">Deskripsi</Label>
            <Textarea
              id="category-description"
              value={formData.description}
              onChange={(event) => onFieldChange('description', event.target.value)}
              placeholder="Deskripsi singkat kategori"
              rows={3}
              disabled={isSaving}
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label htmlFor="category-parent">Parent</Label>
              <Select
                value={formData.parent_id}
                onValueChange={(value) => onFieldChange('parent_id', value ?? '')}
                disabled={isSaving}
              >
                <SelectTrigger id="category-parent" className="mt-1 h-10 w-full rounded-xl">
                  <SelectValue placeholder="Tanpa parent">
                    {selectedParent
                      ? `${selectedParent.name}${selectedParent.is_active === false ? ' (nonaktif)' : ''}`
                      : 'Tanpa parent'}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent align="start" className="rounded-xl p-1">
                  <SelectItem value="">Tanpa parent</SelectItem>
                  {parentOptions.map((category) => (
                    <SelectItem key={category.id} value={category.id}>
                      {category.name}{category.is_active === false ? ' (nonaktif)' : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="category-status">Status</Label>
              <Select
                value={formData.is_active ? 'active' : 'inactive'}
                onValueChange={(value) => onFieldChange('is_active', value === 'active')}
                disabled={isSaving}
              >
                <SelectTrigger id="category-status" className="mt-1 h-10 w-full rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent align="start" className="rounded-xl p-1">
                  <SelectItem value="active">Aktif</SelectItem>
                  <SelectItem value="inactive">Nonaktif</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="category-image">Image URL</Label>
            <Input
              id="category-image"
              value={formData.image_url}
              onChange={(event) => onFieldChange('image_url', event.target.value)}
              placeholder="Opsional"
              disabled={isSaving}
            />
          </div>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Batal
          </Button>
          <Button type="button" onClick={() => void onSave()} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEdit ? 'Simpan' : 'Buat Kategori'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
