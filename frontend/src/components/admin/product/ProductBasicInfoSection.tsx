import { Plus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CreateProductRequest } from '@/services/admin';
import type { Category } from '@/types';
import type { ProductFormErrors } from '@/hooks/useAdminProductForm';

interface ProductBasicInfoSectionProps {
  formData: CreateProductRequest;
  errors: ProductFormErrors;
  categories: Category[];
  categoriesLoading: boolean;
  isLoading: boolean;
  selectClassName: string;
  onFieldChange: <K extends keyof CreateProductRequest>(field: K, value: CreateProductRequest[K]) => void;
  onOpenCategoryModal: () => void;
}

export function ProductBasicInfoSection({
  formData,
  errors,
  categories,
  categoriesLoading,
  isLoading,
  selectClassName,
  onFieldChange,
  onOpenCategoryModal,
}: ProductBasicInfoSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Informasi Produk</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="name" className="text-sm">
            Nama Produk <span className="text-red-500">*</span>
          </Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(event) => onFieldChange('name', event.target.value)}
            className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
            placeholder="Nama produk"
            disabled={isLoading}
          />
          {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
        </div>

        <div>
          <Label htmlFor="short_description" className="text-sm">
            Deskripsi Singkat
          </Label>
          <Input
            id="short_description"
            value={formData.short_description ?? ''}
            onChange={(event) => onFieldChange('short_description', event.target.value)}
            className="mt-1"
            placeholder="Ringkasan singkat (opsional)"
            disabled={isLoading}
          />
        </div>

        <div>
          <Label htmlFor="description" className="text-sm">
            Deskripsi
            <span className="text-muted-foreground font-normal ml-2">
              ({(formData.description ?? '').length}/5000)
            </span>
          </Label>
          <Textarea
            id="description"
            value={formData.description ?? ''}
            onChange={(event) => onFieldChange('description', event.target.value)}
            className={`mt-1 ${errors.description ? 'border-red-500' : ''}`}
            placeholder="Deskripsi lengkap produk"
            rows={4}
            disabled={isLoading}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label htmlFor="category_id" className="text-sm">
                Kategori
              </Label>
              <button
                type="button"
                onClick={onOpenCategoryModal}
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <Plus className="h-3 w-3" /> Kategori Baru
              </button>
            </div>
            <select
              id="category_id"
              value={formData.category_id ?? ''}
              onChange={(event) => onFieldChange('category_id', event.target.value || undefined)}
              disabled={isLoading || categoriesLoading}
              className={`${selectClassName} ${errors.category_id ? 'border-red-500' : 'border-input'}`}
            >
              <option value="">{categoriesLoading ? 'Loading...' : 'Pilih kategori'}</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>}
          </div>

          <div>
            <Label htmlFor="brand" className="text-sm">
              Brand / Merek
            </Label>
            <Input
              id="brand"
              value={formData.brand ?? ''}
              onChange={(event) => onFieldChange('brand', event.target.value)}
              className="mt-1"
              placeholder="cth: Nike, Samsung"
              disabled={isLoading}
            />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
