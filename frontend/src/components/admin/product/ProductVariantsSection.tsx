import { useState } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, ImageIcon, Plus, RefreshCw, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
import { ImageUploadZone } from '@/components/admin/product/image-upload-zone';
import { formatThousands, parseFormattedNumber } from '@/utils/admin-product-form.utils';
import type {
  ProductFormErrors,
  VariantCombinationField,
  VariantCombinationRow,
  VariantOptionField,
  VariantOptionRow,
  VariantTypeField,
  VariantTypeRow,
} from '@/hooks/useAdminProductForm';

interface ProductVariantsSectionProps {
  variantTypes: VariantTypeRow[];
  combinations: VariantCombinationRow[];
  stockQuantity: number;
  variantsOpen: boolean;
  variantLabelsChanged: boolean;
  errors: ProductFormErrors;
  onToggleOpen: () => void;
  onAddVariantType: () => void;
  onRemoveVariantType: (key: string) => void;
  onCloseVariantTypeCombinations: (key: string) => void;
  onUpdateVariantType: <K extends VariantTypeField>(key: string, field: K, value: VariantTypeRow[K]) => void;
  onAddVariantOption: (typeKey: string) => void;
  onRemoveVariantOption: (typeKey: string, optionKey: string) => void;
  onCloseVariantOptionCombinations: (optionKey: string) => void;
  onUpdateVariantOption: <K extends VariantOptionField>(
    typeKey: string,
    optionKey: string,
    field: K,
    value: VariantOptionRow[K]
  ) => void;
  onRemoveVariantOptionImage: (typeKey: string, optionKey: string) => Promise<void>;
  onUpdateCombination: <K extends VariantCombinationField>(
    key: string,
    field: K,
    value: VariantCombinationRow[K]
  ) => void;
  onRegenerateCombinationSku: (key: string) => void;
  onRegenerateAllCombinationSkus: () => void;
}

type DisableTarget =
  | { kind: 'type'; id: string; label: string }
  | { kind: 'option'; id: string; label: string };

export function ProductVariantsSection({
  variantTypes,
  combinations,
  stockQuantity,
  variantsOpen,
  variantLabelsChanged,
  errors,
  onToggleOpen,
  onAddVariantType,
  onRemoveVariantType,
  onCloseVariantTypeCombinations,
  onUpdateVariantType,
  onAddVariantOption,
  onRemoveVariantOption,
  onCloseVariantOptionCombinations,
  onUpdateVariantOption,
  onRemoveVariantOptionImage,
  onUpdateCombination,
  onRegenerateCombinationSku,
  onRegenerateAllCombinationSkus,
}: ProductVariantsSectionProps) {
  const [disableTarget, setDisableTarget] = useState<DisableTarget | null>(null);
  const showMatrixGrid = variantTypes.length === 2 &&
    variantTypes.every((variantType) => variantType.name.trim() && variantType.options.some((option) => option.value.trim()));

  const confirmDisableTarget = (): void => {
    if (!disableTarget) return;
    if (disableTarget.kind === 'type') {
      onCloseVariantTypeCombinations(disableTarget.id);
    } else {
      onCloseVariantOptionCombinations(disableTarget.id);
    }
    setDisableTarget(null);
  };

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
            {variantTypes.length > 0 && (
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({variantTypes.length} tipe, {combinations.length} kombinasi)
              </span>
            )}
          </CardTitle>
          {variantsOpen ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </CardHeader>

      {variantsOpen && (
        <CardContent className="space-y-5">
          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            Definisikan tipe varian, isi opsi, lalu atur kombinasi yang bisa dibeli.
            Tipe visual dapat memiliki gambar per opsi.
          </div>

          <div className="space-y-4">
            {variantTypes.map((variantType, typeIndex) => (
              <div key={variantType.key} className="rounded-lg border border-border p-3 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="grid flex-1 grid-cols-1 sm:grid-cols-[1fr_auto] gap-3">
                    <div>
                      <Label className="text-xs">
                        Tipe varian <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        value={variantType.name}
                        onChange={(event) =>
                          onUpdateVariantType(variantType.key, 'name', event.target.value)
                        }
                        placeholder="Internal / Warna / Ukuran"
                        className={`mt-1 h-8 text-sm ${
                          errors[`variant_type_${typeIndex}`] ? 'border-red-500' : ''
                        }`}
                      />
                    </div>
                    <label className="flex items-end gap-2 pb-2 text-sm">
                      <input
                        type="checkbox"
                        checked={variantType.is_visual}
                        onChange={(event) =>
                          onUpdateVariantType(variantType.key, 'is_visual', event.target.checked)
                        }
                        className="rounded"
                      />
                      Mengubah gambar
                    </label>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => setDisableTarget({
                        kind: 'type',
                        id: variantType.key,
                        label: variantType.name || 'tipe ini',
                      })}
                      className="h-8 px-2 text-xs"
                    >
                      Nonaktifkan tipe
                    </Button>
                    <button type="button" onClick={() => onRemoveVariantType(variantType.key)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </button>
                  </div>
                </div>

                {errors[`variant_options_${typeIndex}`] && (
                  <p className="text-xs text-red-500">{errors[`variant_options_${typeIndex}`]}</p>
                )}

                <div className="space-y-2">
                  <Label className="text-xs">Opsi</Label>
                  <div className="grid gap-2">
                    {variantType.options.map((option) => (
                      <div key={option.key} className="rounded-md border bg-background p-2">
                        <div className="flex items-center gap-2">
                          <Input
                            value={option.value}
                            onChange={(event) =>
                              onUpdateVariantOption(
                                variantType.key,
                                option.key,
                                'value',
                                event.target.value
                              )
                            }
                            placeholder="128GB / Merah / XL"
                            className="h-8 text-sm"
                          />
                          <button
                            type="button"
                            onClick={() => onRemoveVariantOption(variantType.key, option.key)}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setDisableTarget({
                              kind: 'option',
                              id: option.key,
                              label: option.value || 'pilihan ini',
                            })}
                            className="h-8 px-2 text-xs"
                          >
                            Nonaktifkan pilihan
                          </Button>
                        </div>

                        {variantType.is_visual && (
                          <div className="mt-2 grid grid-cols-[56px_1fr] gap-2 items-center">
                            <div className="relative h-14 w-14 overflow-hidden rounded-md bg-muted group">
                              {option.image_url ? (
                                <>
                                  <Image
                                    src={option.image_url}
                                    alt={option.value || 'Variant option image'}
                                    fill
                                    className="object-cover"
                                    sizes="56px"
                                    unoptimized={option.image_url.startsWith('http://localhost')}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => void onRemoveVariantOptionImage(variantType.key, option.key)}
                                    className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition-opacity group-hover:opacity-100"
                                  >
                                    <X className="h-4 w-4 text-white" />
                                  </button>
                                </>
                              ) : (
                                <div className="flex h-full items-center justify-center">
                                  <ImageIcon className="h-5 w-5 text-muted-foreground" />
                                </div>
                              )}
                            </div>
                            <ImageUploadZone
                              onImagesUpload={(urls) => {
                                const imageUrl = urls[0];
                                if (imageUrl) {
                                  onUpdateVariantOption(
                                    variantType.key,
                                    option.key,
                                    'image_url',
                                    imageUrl
                                  );
                                }
                              }}
                              maxFiles={1}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => onAddVariantOption(variantType.key)}
                    className="gap-2"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Opsi
                  </Button>
                </div>
              </div>
            ))}
          </div>

          <Button type="button" variant="outline" size="sm" onClick={onAddVariantType} className="gap-2 w-full">
            <Plus className="h-3.5 w-3.5" /> Tambah Tipe Varian
          </Button>

          {errors.variant_combinations && (
            <p className="text-xs text-red-500">{errors.variant_combinations}</p>
          )}

          {combinations.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm font-medium">
                  {showMatrixGrid ? 'Matrix Kombinasi' : 'Kombinasi'}
                </Label>
                <span className="text-xs text-muted-foreground">{combinations.length} kombinasi</span>
              </div>
              {variantLabelsChanged && (
                <div className="flex flex-col gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    Nama tipe atau opsi berubah. Stok dan harga tetap dipertahankan, tetapi SKU tidak diperbarui otomatis.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onRegenerateAllCombinationSkus}
                    className="h-8 gap-1 border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    Regenerate semua SKU
                  </Button>
                </div>
              )}
              <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">Tambahan harga</span> adalah harga ekstra di atas harga produk.
                <span className="ml-1 font-medium text-foreground">Stok varian</span> adalah stok per kombinasi.
                {stockQuantity > 0 && (
                  <span className="ml-1">Total stok varian aktif tidak boleh melebihi stok produk: {stockQuantity}.</span>
                )}
              </div>
              {showMatrixGrid ? (
                <CombinationMatrix
                  rowType={variantTypes[0]}
                  columnType={variantTypes[1]}
                  combinations={combinations}
                  errors={errors}
                  onUpdateCombination={onUpdateCombination}
                  onRegenerateCombinationSku={onRegenerateCombinationSku}
                />
              ) : (
                <CombinationCards
                  combinations={combinations}
                  errors={errors}
                  onUpdateCombination={onUpdateCombination}
                  onRegenerateCombinationSku={onRegenerateCombinationSku}
                />
              )}
            </div>
          )}

          <Dialog open={disableTarget !== null} onOpenChange={(open) => !open && setDisableTarget(null)}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>Nonaktifkan kombinasi?</DialogTitle>
                <DialogDescription>
                  Kombinasi yang memakai {disableTarget?.label ?? 'pilihan ini'} akan dibuat tidak tersedia untuk pembelian baru.
                  Item yang sudah ada di cart user akan diminta diperbarui saat checkout jika stok pilihan ini tidak tersedia.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setDisableTarget(null)}>
                  Batal
                </Button>
                <Button type="button" onClick={confirmDisableTarget}>
                  Nonaktifkan
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
      )}
    </Card>
  );
}

interface CombinationEditorProps {
  combinations: VariantCombinationRow[];
  errors: ProductFormErrors;
  onUpdateCombination: <K extends VariantCombinationField>(
    key: string,
    field: K,
    value: VariantCombinationRow[K]
  ) => void;
  onRegenerateCombinationSku: (key: string) => void;
}

interface CombinationMatrixProps extends CombinationEditorProps {
  rowType: VariantTypeRow;
  columnType: VariantTypeRow;
}

/* ─── Matrix Grid (desktop: table, mobile: stacked cards per cell) ─── */
function CombinationMatrix({
  rowType,
  columnType,
  combinations,
  errors,
  onUpdateCombination,
  onRegenerateCombinationSku,
}: CombinationMatrixProps) {
  const rowOptions = rowType.options.filter((option) => option.value.trim());
  const columnOptions = columnType.options.filter((option) => option.value.trim());

  return (
    <>
      {/* Desktop matrix table */}
      <div className="hidden lg:block overflow-x-auto rounded-md border">
        <table className="w-full text-sm">
          <thead className="bg-muted/60 text-xs text-muted-foreground">
            <tr>
              <th className="w-28 px-3 py-2 text-left font-medium">{rowType.name}</th>
              {columnOptions.map((option) => (
                <th key={option.key} className="px-3 py-2 text-left font-medium">
                  {option.value}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rowOptions.map((rowOption) => (
              <tr key={rowOption.key} className="border-t align-top">
                <th className="bg-muted/20 px-3 py-3 text-left text-xs font-medium">
                  {rowOption.value}
                </th>
                {columnOptions.map((columnOption) => {
                  const combination = findCombinationByOptionIds(combinations, [
                    rowOption.key,
                    columnOption.key,
                  ]);
                  const combinationIndex = combination
                    ? combinations.findIndex((candidate) => candidate.key === combination.key)
                    : -1;

                  return (
                    <td key={columnOption.key} className="px-3 py-3">
                      {combination ? (
                        <CombinationCellFields
                          combination={combination}
                          combinationIndex={combinationIndex}
                          label={`${rowOption.value} × ${columnOption.value}`}
                          errors={errors}
                          onUpdateCombination={onUpdateCombination}
                          onRegenerateCombinationSku={onRegenerateCombinationSku}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">Tidak tersedia</span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile/Tablet: stacked cards */}
      <div className="lg:hidden space-y-2">
        {rowOptions.map((rowOption) =>
          columnOptions.map((columnOption) => {
            const combination = findCombinationByOptionIds(combinations, [
              rowOption.key,
              columnOption.key,
            ]);
            const combinationIndex = combination
              ? combinations.findIndex((candidate) => candidate.key === combination.key)
              : -1;

            if (!combination) return null;

            return (
              <div
                key={`${rowOption.key}-${columnOption.key}`}
                className="rounded-md border p-3 space-y-2"
              >
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{rowOption.value}</span>
                  <span className="text-muted-foreground text-xs">×</span>
                  <span className="rounded bg-muted px-2 py-0.5 text-xs font-medium">{columnOption.value}</span>
                </div>
                <CombinationCellFields
                  combination={combination}
                  combinationIndex={combinationIndex}
                  label={`${rowOption.value} × ${columnOption.value}`}
                  errors={errors}
                  onUpdateCombination={onUpdateCombination}
                  onRegenerateCombinationSku={onRegenerateCombinationSku}
                />
              </div>
            );
          })
        )}
      </div>
    </>
  );
}

/* ─── Shared cell fields (used by matrix desktop cells and mobile cards) ─── */
function CombinationCellFields({
  combination,
  combinationIndex,
  label,
  errors,
  onUpdateCombination,
  onRegenerateCombinationSku,
}: {
  combination: VariantCombinationRow;
  combinationIndex: number;
  label: string;
  errors: ProductFormErrors;
  onUpdateCombination: <K extends VariantCombinationField>(
    key: string,
    field: K,
    value: VariantCombinationRow[K]
  ) => void;
  onRegenerateCombinationSku: (key: string) => void;
}) {
  return (
    <div className="space-y-2">
      <label className="flex items-center gap-2 text-xs">
        <input
          type="checkbox"
          checked={combination.is_active}
          onChange={(event) =>
            onUpdateCombination(combination.key, 'is_active', event.target.checked)
          }
          className="rounded"
        />
        Aktif
      </label>
      <div className="grid grid-cols-2 gap-2">
        <div>
          <Label className="text-[10px] text-muted-foreground">Tambahan harga</Label>
          <Input
            type="text"
            inputMode="numeric"
            aria-label={`Tambahan harga ${label}`}
            value={formatThousands(combination.price_adjustment)}
            onChange={(event) =>
              onUpdateCombination(
                combination.key,
                'price_adjustment',
                parseFormattedNumber(event.target.value)
              )
            }
            className="h-8"
            placeholder="0"
          />
        </div>
        <div>
          <Label className="text-[10px] text-muted-foreground">Stok varian</Label>
          <Input
            type="number"
            min={0}
            aria-label={`Stok varian ${label}`}
            value={combination.stock_quantity === 0 ? '' : combination.stock_quantity}
            onChange={(event) =>
              onUpdateCombination(
                combination.key,
                'stock_quantity',
                event.target.value === '' ? 0 : Number.parseInt(event.target.value, 10) || 0
              )
            }
            className={`h-8 ${errors[`combination_stock_${combinationIndex}`] ? 'border-red-500' : ''}`}
            placeholder="0"
          />
        </div>
      </div>
      {errors[`combination_stock_${combinationIndex}`] && (
        <p className="text-[11px] text-red-500">{errors[`combination_stock_${combinationIndex}`]}</p>
      )}
      <Input
        value={combination.sku}
        onChange={(event) =>
          onUpdateCombination(combination.key, 'sku', event.target.value)
        }
        className="h-8 text-xs"
        placeholder="SKU"
      />
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onRegenerateCombinationSku(combination.key)}
        className="h-8 w-full gap-1 text-xs"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Regenerate SKU
      </Button>
    </div>
  );
}

/* ─── Card-based Combinations (for 1 type or 3+ types) ─── */
function CombinationCards({
  combinations,
  errors,
  onUpdateCombination,
  onRegenerateCombinationSku,
}: CombinationEditorProps) {
  return (
    <div className="space-y-2">
      {combinations.map((combination, combinationIndex) => (
        <div key={combination.key} className="rounded-md border p-3 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              {combination.option_values.map((value) => (
                <span key={value} className="rounded bg-muted px-2 py-0.5 text-xs font-medium">
                  {value}
                </span>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs flex-shrink-0">
              <input
                type="checkbox"
                checked={combination.is_active}
                onChange={(event) =>
                  onUpdateCombination(combination.key, 'is_active', event.target.checked)
                }
                className="rounded"
              />
              Aktif
            </label>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <div>
              <Label className="text-[10px] text-muted-foreground">Tambahan harga</Label>
              <Input
                type="text"
                inputMode="numeric"
                value={formatThousands(combination.price_adjustment)}
                onChange={(event) =>
                  onUpdateCombination(
                    combination.key,
                    'price_adjustment',
                    parseFormattedNumber(event.target.value)
                  )
                }
                placeholder="0"
                className="h-8"
              />
            </div>
            <div>
              <Label className="text-[10px] text-muted-foreground">Stok</Label>
              <Input
                type="number"
                min={0}
                value={combination.stock_quantity === 0 ? '' : combination.stock_quantity}
                onChange={(event) =>
                  onUpdateCombination(
                    combination.key,
                    'stock_quantity',
                    event.target.value === '' ? 0 : Number.parseInt(event.target.value, 10) || 0
                  )
                }
                className={`h-8 ${errors[`combination_stock_${combinationIndex}`] ? 'border-red-500' : ''}`}
                placeholder="0"
              />
              {errors[`combination_stock_${combinationIndex}`] && (
                <p className="mt-0.5 text-[11px] text-red-500">{errors[`combination_stock_${combinationIndex}`]}</p>
              )}
            </div>
            <div className="col-span-2 sm:col-span-1">
              <Label className="text-[10px] text-muted-foreground">SKU</Label>
              <Input
                value={combination.sku}
                onChange={(event) =>
                  onUpdateCombination(combination.key, 'sku', event.target.value)
                }
                className="h-8 text-xs"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onRegenerateCombinationSku(combination.key)}
                className="mt-2 h-8 w-full gap-1 text-xs"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Regenerate SKU
              </Button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function findCombinationByOptionIds(
  combinations: VariantCombinationRow[],
  optionIds: string[]
): VariantCombinationRow | undefined {
  const expectedKey = optionIDKey(optionIds);
  return combinations.find((combination) => optionIDKey(combination.option_ids) === expectedKey);
}

function optionIDKey(optionIds: string[]): string {
  return optionIds.map((optionId) => optionId.trim().toLowerCase()).sort().join('\u001f');
}
