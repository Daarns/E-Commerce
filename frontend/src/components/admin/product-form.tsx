'use client';

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Loader2, AlertCircle, Trash2, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  CreateProductRequest,
  UpdateProductRequest,
  CreateVariantInput,
  AdminProduct,
} from '@/services/admin';
import { categoryService } from '@/services/product';
import { Category } from '@/types';
import { ImageUploadZone } from './image-upload-zone';
import Image from 'next/image';
import api from '@/services/api';
import { ApiResponse } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ProductFormProps {
  mode: 'create' | 'edit';
  product?: AdminProduct;
  onSubmit: (data: CreateProductRequest | UpdateProductRequest) => Promise<void>;
  isLoading?: boolean;
}

interface VariantRow extends Omit<CreateVariantInput, 'is_active'> {
  _key: number; // local UI key
  is_active: boolean;
}

const emptyVariant = (): VariantRow => ({
  _key: Date.now() + Math.random(),
  variant_type: '',
  variant_value: '',
  price_adjustment: 0,
  stock_quantity: 0,
  sku_suffix: '',
  is_active: true,
});

// ─── Inline Category Modal ────────────────────────────────────────────────────

function NewCategoryModal({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (cat: Category) => void;
}) {
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);

  const handleCreate = async () => {
    if (!name.trim()) { toast.error('Nama kategori wajib diisi'); return; }
    try {
      setSaving(true);
      const res = await api.post<ApiResponse<Category>>('/admin/categories', {
        name: name.trim(),
        is_active: true,
      });
      if (res.data.data) {
        toast.success(`Kategori "${res.data.data.name}" berhasil dibuat`);
        onCreated(res.data.data);
        setName('');
        onClose();
      }
    } catch (err) {
      const msg = (err as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message ?? 'Gagal membuat kategori';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-sm bg-card border border-border rounded-xl shadow-2xl p-6 space-y-4">
        <h3 className="font-semibold">Tambah Kategori Baru</h3>
        <div>
          <Label className="text-sm">Nama Kategori *</Label>
          <Input
            autoFocus
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleCreate(); }}
            placeholder="cth: Elektronik"
            className="mt-1"
          />
        </div>
        <div className="flex gap-3 justify-end">
          <Button variant="outline" size="sm" onClick={onClose} disabled={saving}>Batal</Button>
          <Button size="sm" onClick={handleCreate} disabled={saving} className="gap-2">
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Buat Kategori
          </Button>
        </div>
      </div>
    </div>
  );
}

// ─── Form ─────────────────────────────────────────────────────────────────────

export function ProductForm({ mode, product, onSubmit, isLoading = false }: ProductFormProps) {
  const isEdit = mode === 'edit';

  const [formData, setFormData] = useState<CreateProductRequest>({
    name:              product?.name ?? '',
    description:       product?.description ?? '',
    short_description: '',
    regular_price:     parseFloat(String(product?.regular_price ?? product?.price ?? 0)) || 0,
    sale_price:        product?.sale_price ? parseFloat(String(product.sale_price)) : undefined,
    stock_quantity:    product?.stock_quantity ?? 0,
    category_id:       product?.category_id ?? product?.category?.id ?? undefined,
    brand:             product?.brand ?? '',
    sku:               product?.sku ?? '',
    status:            (product?.status as 'active' | 'draft' | 'archived') ?? 'active',
    meta_title:        product?.meta_title ?? '',
    meta_description:  product?.meta_description ?? '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [categoriesLoading, setCategoriesLoading] = useState(true);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>(product?.image_urls ?? []);
  const [variants, setVariants] = useState<VariantRow[]>([]);
  const [variantsOpen, setVariantsOpen] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const loadCategories = useCallback(async () => {
    try {
      setCategoriesLoading(true);
      const cats = await categoryService.getCategories();
      setCategories(cats.length > 0 ? cats : await categoryService.getCategoryTree());
    } catch {
      toast.error('Gagal memuat kategori');
    } finally {
      setCategoriesLoading(false);
    }
  }, []);

  useEffect(() => { loadCategories(); }, [loadCategories]);

  const set = <K extends keyof CreateProductRequest>(field: K, value: CreateProductRequest[K]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Required';
    if (formData.name.length > 1 && formData.name.length < 2) e.name = 'Min 2 karakter';
    if (formData.regular_price <= 0) e.regular_price = 'Harus > 0';
    if (formData.stock_quantity < 0) e.stock_quantity = 'Tidak boleh negatif';
    if (uploadedImages.length === 0 && !isEdit) e.images = 'Minimal 1 gambar';
    // Variant validation
    variants.forEach((v, i) => {
      if (!v.variant_type.trim()) e[`v_type_${i}`] = 'Required';
      if (!v.variant_value.trim()) e[`v_val_${i}`] = 'Required';
    });
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) { toast.error('Perbaiki error pada form'); return; }
    try {
      if (isEdit && product) {
        const payload: UpdateProductRequest = {
          id:              product.id,
          version:         (product as AdminProduct & { version?: number }).version ?? 1,
          name:            formData.name,
          description:     formData.description,
          short_description: formData.short_description,
          regular_price:   formData.regular_price,
          sale_price:      formData.sale_price,
          stock_quantity:  formData.stock_quantity,
          category_id:     formData.category_id,
          brand:           formData.brand,
          sku:             formData.sku,
          status:          formData.status,
          meta_title:      formData.meta_title,
          meta_description: formData.meta_description,
        };
        await onSubmit(payload);
      } else {
        await onSubmit({ ...formData, image_urls: uploadedImages });
      }
    } catch { /* parent handles toast */ }
  };

  const addVariant = () => setVariants(prev => [...prev, emptyVariant()]);
  const removeVariant = (key: number) => setVariants(prev => prev.filter(v => v._key !== key));
  const updateVariant = (key: number, field: keyof VariantRow, value: unknown) => {
    setVariants(prev => prev.map(v => v._key === key ? { ...v, [field]: value } : v));
  };

  const selectClass = `mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm
    ring-offset-background focus-visible:outline-none focus-visible:ring-2
    focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`;

  return (
    <>
      <NewCategoryModal
        open={catModalOpen}
        onClose={() => setCatModalOpen(false)}
        onCreated={cat => {
          setCategories(prev => [...prev, cat]);
          set('category_id', cat.id);
        }}
      />

      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

          {/* ── LEFT (2/3) ── */}
          <div className="lg:col-span-2 space-y-5">

            {/* Basic Info */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Informasi Produk</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">

                {/* Name */}
                <div>
                  <Label htmlFor="name" className="text-sm">Nama Produk <span className="text-red-500">*</span></Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={e => set('name', e.target.value)}
                    className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
                    placeholder="Nama produk"
                    disabled={isLoading}
                  />
                  {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
                </div>

                {/* Short Description */}
                <div>
                  <Label className="text-sm">Deskripsi Singkat</Label>
                  <Input
                    value={formData.short_description ?? ''}
                    onChange={e => set('short_description', e.target.value)}
                    className="mt-1"
                    placeholder="Ringkasan singkat (opsional)"
                    disabled={isLoading}
                  />
                </div>

                {/* Description */}
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
                    onChange={e => set('description', e.target.value)}
                    className={`mt-1 ${errors.description ? 'border-red-500' : ''}`}
                    placeholder="Deskripsi lengkap produk"
                    rows={4}
                    disabled={isLoading}
                  />
                </div>

                {/* Category + Brand row */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <Label htmlFor="category_id" className="text-sm">Kategori</Label>
                      <button
                        type="button"
                        onClick={() => setCatModalOpen(true)}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <Plus className="h-3 w-3" /> Kategori Baru
                      </button>
                    </div>
                    <select
                      id="category_id"
                      value={formData.category_id ?? ''}
                      onChange={e => set('category_id', e.target.value || undefined)}
                      disabled={isLoading || categoriesLoading}
                      className={`${selectClass} ${errors.category_id ? 'border-red-500' : 'border-input'}`}
                    >
                      <option value="">
                        {categoriesLoading ? 'Loading...' : '— Pilih kategori —'}
                      </option>
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                    {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>}
                  </div>

                  <div>
                    <Label className="text-sm">Brand / Merek</Label>
                    <Input
                      value={formData.brand ?? ''}
                      onChange={e => set('brand', e.target.value)}
                      className="mt-1"
                      placeholder="cth: Nike, Samsung"
                      disabled={isLoading}
                    />
                  </div>
                </div>

              </CardContent>
            </Card>

            {/* Images */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">
                  Gambar Produk {!isEdit && <span className="text-red-500">*</span>}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    ({uploadedImages.length}/10)
                  </span>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <ImageUploadZone
                  onImagesUpload={newImgs => {
                    setUploadedImages(prev => [...prev, ...newImgs]);
                    setErrors(prev => { const n = { ...prev }; delete n.images; return n; });
                  }}
                  disabled={isLoading || uploadedImages.length >= 10}
                  maxFiles={10 - uploadedImages.length}
                />
                {errors.images && (
                  <Alert variant="destructive" className="py-2">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="text-sm">{errors.images}</AlertDescription>
                  </Alert>
                )}
                {uploadedImages.length > 0 && (
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-3">
                    {uploadedImages.map((url, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
                      >
                        <Image
                          src={url}
                          alt={`Product ${idx + 1}`}
                          fill
                          className="object-cover"
                          sizes="(max-width: 640px) 25vw, 20vw"
                          unoptimized={url.startsWith('http://localhost')}
                        />
                        <button
                          type="button"
                          onClick={() => setUploadedImages(prev => prev.filter((_, i) => i !== idx))}
                          disabled={isLoading}
                          className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                        >
                          <X className="w-5 h-5 text-white" />
                        </button>
                      </motion.div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Variants */}
            <Card>
              <CardHeader className="pb-3">
                <button
                  type="button"
                  onClick={() => setVariantsOpen(o => !o)}
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
                    Varian akan ditambahkan setelah produk berhasil dibuat.
                    Contoh: Tipe = &quot;ukuran&quot;, Nilai = &quot;M&quot;
                  </p>

                  {variants.map((v, idx) => (
                    <div key={v._key} className="border border-border rounded-lg p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-muted-foreground">Varian #{idx + 1}</span>
                        <button type="button" onClick={() => removeVariant(v._key)}>
                          <Trash2 className="h-3.5 w-3.5 text-destructive" />
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <Label className="text-xs">Tipe <span className="text-red-500">*</span></Label>
                          <Input
                            value={v.variant_type}
                            onChange={e => updateVariant(v._key, 'variant_type', e.target.value)}
                            placeholder="ukuran / warna / material"
                            className={`mt-1 h-8 text-sm ${errors[`v_type_${idx}`] ? 'border-red-500' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Nilai <span className="text-red-500">*</span></Label>
                          <Input
                            value={v.variant_value}
                            onChange={e => updateVariant(v._key, 'variant_value', e.target.value)}
                            placeholder="M / Merah / Katun"
                            className={`mt-1 h-8 text-sm ${errors[`v_val_${idx}`] ? 'border-red-500' : ''}`}
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Penyesuaian Harga (Rp)</Label>
                          <Input
                            type="number"
                            value={v.price_adjustment ?? 0}
                            onChange={e => updateVariant(v._key, 'price_adjustment', parseFloat(e.target.value) || 0)}
                            placeholder="0"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">Stok <span className="text-red-500">*</span></Label>
                          <Input
                            type="number"
                            min={0}
                            value={v.stock_quantity}
                            onChange={e => updateVariant(v._key, 'stock_quantity', parseInt(e.target.value) || 0)}
                            placeholder="0"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div>
                          <Label className="text-xs">SKU Suffix</Label>
                          <Input
                            value={v.sku_suffix ?? ''}
                            onChange={e => updateVariant(v._key, 'sku_suffix', e.target.value)}
                            placeholder="-M / -RED"
                            className="mt-1 h-8 text-sm"
                          />
                        </div>
                        <div className="flex items-end pb-1">
                          <label className="flex items-center gap-2 cursor-pointer text-sm">
                            <input
                              type="checkbox"
                              checked={v.is_active}
                              onChange={e => updateVariant(v._key, 'is_active', e.target.checked)}
                              className="rounded"
                            />
                            Aktif
                          </label>
                        </div>
                      </div>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addVariant}
                    className="gap-2 w-full"
                  >
                    <Plus className="h-3.5 w-3.5" /> Tambah Varian
                  </Button>
                </CardContent>
              )}
            </Card>
          </div>

          {/* ── RIGHT (1/3) ── */}
          <div className="space-y-5">

            {/* Pricing */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Harga</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm">Harga Normal (Rp) <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={formData.regular_price || ''}
                    onChange={e => set('regular_price', parseFloat(e.target.value) || 0)}
                    className={`mt-1 ${errors.regular_price ? 'border-red-500' : ''}`}
                    placeholder="150000"
                    min={0}
                    step={1000}
                    disabled={isLoading}
                  />
                  {errors.regular_price && <p className="text-xs text-red-500 mt-1">{errors.regular_price}</p>}
                </div>
                <div>
                  <Label className="text-sm">Harga Diskon (Rp)</Label>
                  <Input
                    type="number"
                    value={formData.sale_price ?? ''}
                    onChange={e => set('sale_price', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                    className="mt-1"
                    placeholder="100000"
                    min={0}
                    step={1000}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Inventory */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Inventori</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm">Stok <span className="text-red-500">*</span></Label>
                  <Input
                    type="number"
                    value={formData.stock_quantity === 0 ? '' : formData.stock_quantity}
                    onChange={e => set('stock_quantity', e.target.value === '' ? 0 : parseInt(e.target.value, 10))}
                    className={`mt-1 ${errors.stock_quantity ? 'border-red-500' : ''}`}
                    placeholder="0"
                    min={0}
                    disabled={isLoading}
                  />
                  {errors.stock_quantity && <p className="text-xs text-red-500 mt-1">{errors.stock_quantity}</p>}
                </div>
                <div>
                  <Label className="text-sm">SKU
                    <span className="text-muted-foreground font-normal ml-1">(auto jika kosong)</span>
                  </Label>
                  <Input
                    value={formData.sku ?? ''}
                    onChange={e => set('sku', e.target.value)}
                    className="mt-1"
                    placeholder="PROD-001"
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Status */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Status</CardTitle>
              </CardHeader>
              <CardContent>
                <select
                  value={formData.status ?? 'active'}
                  onChange={e => set('status', e.target.value as 'active' | 'draft' | 'archived')}
                  disabled={isLoading}
                  className={`${selectClass} border-input`}
                >
                  <option value="active">Aktif — tampil di toko</option>
                  <option value="draft">Draft — belum dipublikasi</option>
                  <option value="archived">Diarsipkan</option>
                </select>
              </CardContent>
            </Card>

            {/* SEO */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base">SEO <span className="text-muted-foreground font-normal text-xs">(opsional)</span></CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-sm">Meta Title</Label>
                  <Input
                    value={formData.meta_title ?? ''}
                    onChange={e => set('meta_title', e.target.value)}
                    className="mt-1"
                    placeholder="Judul halaman SEO"
                    disabled={isLoading}
                  />
                </div>
                <div>
                  <Label className="text-sm">Meta Description</Label>
                  <Textarea
                    value={formData.meta_description ?? ''}
                    onChange={e => set('meta_description', e.target.value)}
                    className="mt-1"
                    placeholder="Deskripsi halaman untuk mesin pencari"
                    rows={2}
                    disabled={isLoading}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
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
      </motion.form>
    </>
  );
}
