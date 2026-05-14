import { ChevronDown, ChevronUp, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type {
  ProductFormErrors,
  VariantRow,
  VariantRowField,
} from '@/hooks/useAdminProductForm';

interface ProductVariantsSectionProps {
  variants: VariantRow[];
  variantsOpen: boolean;
  errors: ProductFormErrors;
  onToggleOpen: () => void;
  onAddVariant: () => void;
  onRemoveVariant: (key: string) => void;
  onUpdateVariant: <K extends VariantRowField>(key: string, field: K, value: VariantRow[K]) => void;
}

export function ProductVariantsSection({
  variants,
  variantsOpen,
  errors,
  onToggleOpen,
  onAddVariant,
  onRemoveVariant,
  onUpdateVariant,
}: ProductVariantsSectionProps) {
  return (
    <Card>
      <CardHeader className="pb-3">
        <button
          type="button"
          onClick={onToggleOpen}
          className="flex items-center justify-between w-full text-left"
        >
          <CardTitle className="text-base">
            Varian Produk
            {variants.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({variants.length} varian)
              </span>
            )}
          </CardTitle>
          {variantsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </CardHeader>

      {variantsOpen && (
        <CardContent className="space-y-3">
          <p className="text-xs text-muted-foreground">
            Varian akan ditambahkan setelah produk berhasil dibuat. Contoh: Tipe = &quot;ukuran&quot;,
            Nilai = &quot;M&quot;
          </p>

          {variants.map((variant, index) => (
            <div key={variant.key} className="border border-border rounded-lg p-3 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-muted-foreground">
                  Varian #{index + 1}
                </span>
                <button type="button" onClick={() => onRemoveVariant(variant.key)}>
                  <Trash2 className="h-3.5 w-3.5 text-destructive" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">
                    Tipe <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={variant.variant_type}
                    onChange={(event) =>
                      onUpdateVariant(variant.key, 'variant_type', event.target.value)
                    }
                    placeholder="ukuran / warna / material"
                    className={`mt-1 h-8 text-sm ${errors[`v_type_${index}`] ? 'border-red-500' : ''}`}
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Nilai <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={variant.variant_value}
                    onChange={(event) =>
                      onUpdateVariant(variant.key, 'variant_value', event.target.value)
                    }
                    placeholder="M / Merah / Katun"
                    className={`mt-1 h-8 text-sm ${errors[`v_val_${index}`] ? 'border-red-500' : ''}`}
                  />
                </div>
                <div>
                  <Label className="text-xs">Penyesuaian Harga (Rp)</Label>
                  <Input
                    type="number"
                    value={variant.price_adjustment ?? 0}
                    onChange={(event) =>
                      onUpdateVariant(
                        variant.key,
                        'price_adjustment',
                        Number.parseFloat(event.target.value) || 0
                      )
                    }
                    placeholder="0"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">
                    Stok <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    type="number"
                    min={0}
                    value={variant.stock_quantity}
                    onChange={(event) =>
                      onUpdateVariant(
                        variant.key,
                        'stock_quantity',
                        Number.parseInt(event.target.value, 10) || 0
                      )
                    }
                    placeholder="0"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div>
                  <Label className="text-xs">SKU Suffix</Label>
                  <Input
                    value={variant.sku_suffix ?? ''}
                    onChange={(event) => onUpdateVariant(variant.key, 'sku_suffix', event.target.value)}
                    placeholder="-M / -RED"
                    className="mt-1 h-8 text-sm"
                  />
                </div>
                <div className="flex items-end pb-1">
                  <label className="flex items-center gap-2 cursor-pointer text-sm">
                    <input
                      type="checkbox"
                      checked={variant.is_active}
                      onChange={(event) =>
                        onUpdateVariant(variant.key, 'is_active', event.target.checked)
                      }
                      className="rounded"
                    />
                    Aktif
                  </label>
                </div>
              </div>
            </div>
          ))}

          <Button type="button" variant="outline" size="sm" onClick={onAddVariant} className="gap-2 w-full">
            <Plus className="h-3.5 w-3.5" /> Tambah Varian
          </Button>
        </CardContent>
      )}
    </Card>
  );
}
