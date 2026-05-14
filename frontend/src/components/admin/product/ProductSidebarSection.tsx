import { Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { CreateProductRequest } from '@/services/admin';
import type { ProductFormErrors } from '@/hooks/useAdminProductForm';

interface ProductSidebarSectionProps {
  formData: CreateProductRequest;
  errors: ProductFormErrors;
  isEdit: boolean;
  isLoading: boolean;
  selectClassName: string;
  onFieldChange: <K extends keyof CreateProductRequest>(field: K, value: CreateProductRequest[K]) => void;
}

export function ProductSidebarSection({
  formData,
  errors,
  isEdit,
  isLoading,
  selectClassName,
  onFieldChange,
}: ProductSidebarSectionProps) {
  const handleStatusChange = (value: string): void => {
    switch (value) {
      case 'active':
      case 'draft':
      case 'archived':
        onFieldChange('status', value);
        break;
    }
  };

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Harga</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="regular_price" className="text-sm">
              Harga Normal (Rp) <span className="text-red-500">*</span>
            </Label>
            <Input
              id="regular_price"
              type="number"
              value={formData.regular_price || ''}
              onChange={(event) => onFieldChange('regular_price', Number.parseFloat(event.target.value) || 0)}
              className={`mt-1 ${errors.regular_price ? 'border-red-500' : ''}`}
              placeholder="150000"
              min={0}
              step={1000}
              disabled={isLoading}
            />
            {errors.regular_price && <p className="text-xs text-red-500 mt-1">{errors.regular_price}</p>}
          </div>
          <div>
            <Label htmlFor="sale_price" className="text-sm">
              Harga Diskon (Rp)
            </Label>
            <Input
              id="sale_price"
              type="number"
              value={formData.sale_price ?? ''}
              onChange={(event) =>
                onFieldChange(
                  'sale_price',
                  event.target.value === '' ? undefined : Number.parseFloat(event.target.value)
                )
              }
              className="mt-1"
              placeholder="100000"
              min={0}
              step={1000}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Inventori</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="stock_quantity" className="text-sm">
              Stok <span className="text-red-500">*</span>
            </Label>
            <Input
              id="stock_quantity"
              type="number"
              value={formData.stock_quantity === 0 ? '' : formData.stock_quantity}
              onChange={(event) =>
                onFieldChange(
                  'stock_quantity',
                  event.target.value === '' ? 0 : Number.parseInt(event.target.value, 10)
                )
              }
              className={`mt-1 ${errors.stock_quantity ? 'border-red-500' : ''}`}
              placeholder="0"
              min={0}
              disabled={isLoading}
            />
            {errors.stock_quantity && <p className="text-xs text-red-500 mt-1">{errors.stock_quantity}</p>}
          </div>
          <div>
            <Label htmlFor="sku" className="text-sm">
              SKU
              <span className="text-muted-foreground font-normal ml-1">(auto jika kosong)</span>
            </Label>
            <Input
              id="sku"
              value={formData.sku ?? ''}
              onChange={(event) => onFieldChange('sku', event.target.value)}
              className="mt-1"
              placeholder="PROD-001"
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent>
          <select
            value={formData.status ?? 'active'}
            onChange={(event) => handleStatusChange(event.target.value)}
            disabled={isLoading}
            className={`${selectClassName} border-input`}
          >
            <option value="active">Aktif - tampil di toko</option>
            <option value="draft">Draft - belum dipublikasi</option>
            <option value="archived">Diarsipkan</option>
          </select>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">
            SEO <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label htmlFor="meta_title" className="text-sm">
              Meta Title
            </Label>
            <Input
              id="meta_title"
              value={formData.meta_title ?? ''}
              onChange={(event) => onFieldChange('meta_title', event.target.value)}
              className="mt-1"
              placeholder="Judul halaman SEO"
              disabled={isLoading}
            />
          </div>
          <div>
            <Label htmlFor="meta_description" className="text-sm">
              Meta Description
            </Label>
            <Textarea
              id="meta_description"
              value={formData.meta_description ?? ''}
              onChange={(event) => onFieldChange('meta_description', event.target.value)}
              className="mt-1"
              placeholder="Deskripsi halaman untuk mesin pencari"
              rows={2}
              disabled={isLoading}
            />
          </div>
        </CardContent>
      </Card>

      <Button type="submit" disabled={isLoading} size="lg" className="w-full">
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            {isEdit ? 'Menyimpan...' : 'Membuat...'}
          </>
        ) : (
          <>
            <Plus className="w-4 h-4 mr-2" />
            {isEdit ? 'Simpan Perubahan' : 'Buat Produk'}
          </>
        )}
      </Button>
    </div>
  );
}
