'use client';

import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAdminCategoryCreate } from '@/hooks/useAdminCategoryCreate';
import type { Category } from '@/types';

interface NewCategoryModalProps {
  open: boolean;
  onClose: () => void;
  onCreated: (category: Category) => void;
}

export function NewCategoryModal({ open, onClose, onCreated }: NewCategoryModalProps) {
  const { name, saving, setName, createCategory, reset } = useAdminCategoryCreate();

  const closeModal = (): void => {
    if (saving) return;
    reset();
    onClose();
  };

  const handleCreate = async (): Promise<void> => {
    const category = await createCategory();
    if (!category) return;
    onCreated(category);
    onClose();
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Tutup modal kategori"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={closeModal}
      />
      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-6 space-y-4">
        <h3 className="font-semibold">Tambah Kategori Baru</h3>
        <div>
          <Label htmlFor="new-category-name" className="text-sm">
            Nama Kategori *
          </Label>
          <Input
            id="new-category-name"
            autoFocus
            value={name}
            onChange={(event) => setName(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void handleCreate();
            }}
            placeholder="cth: Elektronik"
            className="mt-1"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={closeModal} disabled={saving}>
            Batal
          </Button>
          <Button size="sm" onClick={() => void handleCreate()} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Buat Kategori
          </Button>
        </div>
      </div>
    </div>
  );
}
