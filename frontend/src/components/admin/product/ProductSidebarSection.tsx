import { useState } from 'react';
import { ChevronDown, ChevronUp, Loader2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import type { CreateProductRequest } from '@/services/admin';
import type { ProductFormErrors } from '@/hooks/useAdminProductForm';
import { formatCurrency } from '@/utils';
import { formatThousands, parseFormattedNumber } from '@/utils/admin-product-form.utils';

interface ProductSidebarSectionProps {
  formData: CreateProductRequest;
  errors: ProductFormErrors;
  isEdit: boolean;
  isLoading: boolean;
  discountPercent: number;
  onFieldChange: <K extends keyof CreateProductRequest>(field: K, value: CreateProductRequest[K]) => void;
  onDiscountPercentChange: (value: number) => void;
}

export function ProductSidebarSection({
  formData,
  errors,
  isEdit,
  isLoading,
  discountPercent,
  onFieldChange,
  onDiscountPercentChange,
}: ProductSidebarSectionProps) {
  const [seoOpen, setSeoOpen] = useState(false);

  const handleStatusChange = (value: string | null): void => {
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
      {/* ── Desktop: separate cards | Mobile: merged compact card ── */}

      {/* Price + Inventory + Status — merged on mobile */}
      <Card>
        <CardContent className="pt-5 space-y-4">
          {/* Price Section */}
          <div>
            <p className="text-sm font-semibold mb-2">Harga</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="regular_price" className="text-xs">
                  Harga Normal (Rp) <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="regular_price"
                  type="text"
                  inputMode="numeric"
                  value={formatThousands(formData.regular_price)}
                  onChange={(event) => onFieldChange('regular_price', parseFormattedNumber(event.target.value))}
                  className={`mt-1 h-9 ${errors.regular_price ? 'border-red-500' : ''}`}
                  placeholder="150.000"
                  disabled={isLoading}
                />
                {errors.regular_price && <p className="text-xs text-red-500 mt-1">{errors.regular_price}</p>}
              </div>
              <div>
                <Label htmlFor="discount_percent" className="text-xs">
                  Diskon (%)
                </Label>
                <Input
                  id="discount_percent"
                  type="number"
                  value={discountPercent || ''}
                  onChange={(event) =>
                    onDiscountPercentChange(
                      event.target.value === '' ? 0 : Number.parseFloat(event.target.value) || 0
                    )
                  }
                  className="mt-1 h-9"
                  placeholder="0"
                  min={0}
                  max={100}
                  step={1}
                  disabled={isLoading}
                />
              </div>
            </div>
            {discountPercent > 0 && (
              <p className="mt-1 text-xs text-muted-foreground">
                Harga setelah diskon: {formatCurrency(formData.sale_price ?? 0)}
              </p>
            )}

            {discountPercent > 0 && (
              <div className="mt-2 space-y-2 rounded-md border bg-muted/30 p-3">
                <p className="text-xs font-medium">Periode flash sale (opsional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label htmlFor="sale_start_date" className="text-xs">
                      Mulai
                    </Label>
                    <Input
                      id="sale_start_date"
                      type="datetime-local"
                      value={formData.sale_start_date ?? ''}
                      onChange={(event) =>
                        onFieldChange('sale_start_date', event.target.value || undefined)
                      }
                      className="mt-1 h-8 text-sm"
                      disabled={isLoading}
                    />
                  </div>
                  <div>
                    <Label htmlFor="sale_end_date" className="text-xs">
                      Berakhir
                    </Label>
                    <Input
                      id="sale_end_date"
                      type="datetime-local"
                      value={formData.sale_end_date ?? ''}
                      onChange={(event) =>
                        onFieldChange('sale_end_date', event.target.value || undefined)
                      }
                      className="mt-1 h-8 text-sm"
                      disabled={isLoading}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Divider */}
          <hr className="border-border" />

          {/* Inventory + Status — side by side */}
          <div>
            <p className="text-sm font-semibold mb-2">Inventori & Status</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <Label htmlFor="stock_quantity" className="text-xs">
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
                  className={`mt-1 h-9 ${errors.stock_quantity ? 'border-red-500' : ''}`}
                  placeholder="0"
                  min={0}
                  disabled={isLoading}
                />
                {errors.stock_quantity && <p className="text-xs text-red-500 mt-1">{errors.stock_quantity}</p>}
              </div>
              <div>
                <Label htmlFor="sku" className="text-xs">
                  SKU
                </Label>
                <Input
                  id="sku"
                  value={formData.sku ?? ''}
                  onChange={(event) => onFieldChange('sku', event.target.value)}
                  className="mt-1 h-9"
                  placeholder="PROD-001"
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label htmlFor="status" className="text-xs">
                  Status
                </Label>
                <Select
                  value={formData.status ?? 'active'}
                  onValueChange={handleStatusChange}
                  disabled={isLoading}
                >
                  <SelectTrigger
                    id="status"
                    size="sm"
                    className="mt-1 h-9 w-full rounded-xl bg-background px-3 shadow-sm hover:bg-muted/30"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent align="start" className="rounded-xl p-1 shadow-lg">
                    <SelectItem value="active" className="rounded-lg py-2">Aktif</SelectItem>
                    <SelectItem value="draft" className="rounded-lg py-2">Draft</SelectItem>
                    <SelectItem value="archived" className="rounded-lg py-2">Arsip</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SEO — collapsible accordion */}
      <Card>
        <CardHeader className="py-3 px-4">
          <button
            type="button"
            onClick={() => setSeoOpen((open) => !open)}
            className="flex items-center justify-between w-full text-left"
          >
            <CardTitle className="text-sm">
              SEO <span className="text-muted-foreground font-normal text-xs">(opsional)</span>
            </CardTitle>
            {seoOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>
        </CardHeader>
        {seoOpen && (
          <CardContent className="pt-0 space-y-3">
            <div>
              <Label htmlFor="meta_title" className="text-xs">
                Meta Title
              </Label>
              <Input
                id="meta_title"
                value={formData.meta_title ?? ''}
                onChange={(event) => onFieldChange('meta_title', event.target.value)}
                className="mt-1 h-9"
                placeholder="Judul halaman SEO"
                disabled={isLoading}
              />
            </div>
            <div>
              <Label htmlFor="meta_description" className="text-xs">
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
        )}
      </Card>

      {/* Submit Button — on desktop it's here, on mobile it's via sticky bar */}
      <div className="hidden lg:block">
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
    </div>
  );
}
