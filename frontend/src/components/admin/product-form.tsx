'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Plus, X, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { CreateProductRequest, UpdateProductRequest, AdminProduct } from '@/services/admin';
import { categoryService } from '@/services/product';
import { Category } from '@/types';
import { ImageUploadZone } from './image-upload-zone';

interface ProductFormProps {
  mode: 'create' | 'edit';
  product?: AdminProduct;
  // In create mode data is always CreateProductRequest.
  // In edit mode it is UpdateProductRequest (which extends CreateProductRequest).
  // Accepting CreateProductRequest covers both — callers narrow as needed.
  onSubmit: (data: CreateProductRequest & { id?: string }) => Promise<void>;
  isLoading?: boolean;
}

export function ProductForm({ mode, product, onSubmit, isLoading = false }: ProductFormProps) {
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: product?.name || '',
    description: product?.description || '',
    // category_id may come directly OR from the nested category object
    category_id: product?.category_id || product?.category?.id || '',
    subcategory_id: product?.subcategory_id || '',
    price: parseFloat(String(product?.price ?? product?.regular_price ?? 0)) || 0,
    sale_price: parseFloat(String(product?.sale_price ?? 0)) || undefined,
    discount_percentage: product?.discount_percentage || 0,
    stock_quantity: product?.stock_quantity || 0,
    sku: product?.sku || '',
    slug: product?.slug || '',
    is_active: product?.is_active ?? true,
    meta_title: product?.meta_title || '',
    meta_description: product?.meta_description || '',
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [subcategories, setSubcategories] = useState<Category[]>([]);
  const [uploadedImages, setUploadedImages] = useState<string[]>(product?.image_urls || []);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [categoriesLoading, setCategoriesLoading] = useState(true);

  useEffect(() => { loadCategories(); }, []);

  useEffect(() => {
    if (formData.category_id && categories.length > 0) {
      const selected = categories.find(c => c.id === formData.category_id);
      setSubcategories(selected?.children || []);
    }
  }, [formData.category_id, categories]);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      // Use flat list — more reliable than tree for dropdowns
      const cats = await categoryService.getCategories();
      if (cats.length > 0) {
        setCategories(cats);
      } else {
        // Fallback to tree endpoint
        const tree = await categoryService.getCategoryTree();
        setCategories(tree);
      }
    } catch {
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!formData.name.trim()) e.name = 'Required';
    else if (formData.name.length < 2) e.name = 'Min 2 characters';
    if (!formData.description.trim()) e.description = 'Required';
    if (!formData.category_id) e.category_id = 'Required';
    if (formData.price <= 0) e.price = 'Must be > 0';
    if (formData.stock_quantity < 0) e.stock_quantity = 'Cannot be negative';
    if (uploadedImages.length === 0) e.images = 'At least one image required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) { toast.error('Please fix form errors'); return; }
    try {
      await onSubmit(mode === 'edit' ? { ...formData, id: product!.id } : formData);
    } catch { /* parent handles toast */ }
  };

  const set = (field: keyof CreateProductRequest, value: unknown) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Auto-generate slug from name in create mode
    if (field === 'name' && !product) {
      const slug = String(value).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
      setFormData(prev => ({ ...prev, slug }));
    }
    if (errors[field]) setErrors(prev => { const n = { ...prev }; delete n[field]; return n; });
  };

  return (
    <motion.form
      onSubmit={handleSubmit}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5"
    >
      {/* ── 2-column layout: left = main info, right = sidebar fields ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">

        {/* ── LEFT COLUMN (2/3 width) ── */}
        <div className="lg:col-span-2 space-y-5">

          {/* Basic Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {/* Name */}
              <div>
                <Label htmlFor="name" className="text-sm">Product Name <span className="text-red-500">*</span></Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={e => set('name', e.target.value)}
                  className={`mt-1 ${errors.name ? 'border-red-500' : ''}`}
                  placeholder="Enter product name"
                  disabled={isLoading}
                />
                {errors.name && <p className="text-xs text-red-500 mt-1">{errors.name}</p>}
              </div>

              {/* Description */}
              <div>
                <Label htmlFor="description" className="text-sm">
                  Description <span className="text-red-500">*</span>
                  <span className="text-muted-foreground font-normal ml-2">
                    ({formData.description.length}/5000)
                  </span>
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={e => set('description', e.target.value)}
                  className={`mt-1 ${errors.description ? 'border-red-500' : ''}`}
                  placeholder="Detailed product description"
                  rows={4}
                  disabled={isLoading}
                />
                {errors.description && <p className="text-xs text-red-500 mt-1">{errors.description}</p>}
              </div>

              {/* Category row — using native <select> to avoid Radix async render mismatch */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="category_id" className="text-sm">
                    Category <span className="text-red-500">*</span>
                  </Label>
                  <select
                    id="category_id"
                    value={formData.category_id}
                    onChange={e => set('category_id', e.target.value)}
                    disabled={isLoading || categoriesLoading}
                    className={`mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm
                      ring-offset-background focus-visible:outline-none focus-visible:ring-2
                      focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed
                      disabled:opacity-50 ${
                        errors.category_id ? 'border-red-500' : 'border-input'
                      }`}
                  >
                    <option value="" disabled>
                      {categoriesLoading ? 'Loading...' : 'Select category'}
                    </option>
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.name}</option>
                    ))}
                  </select>
                  {errors.category_id && <p className="text-xs text-red-500 mt-1">{errors.category_id}</p>}
                </div>

                {subcategories.length > 0 && (
                  <div>
                    <Label htmlFor="subcategory_id" className="text-sm">Subcategory</Label>
                    <select
                      id="subcategory_id"
                      value={formData.subcategory_id || ''}
                      onChange={e => set('subcategory_id', e.target.value)}
                      disabled={isLoading}
                      className="mt-1 flex h-10 w-full rounded-md border border-input bg-background px-3 py-2
                        text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2
                        focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <option value="">None</option>
                      {subcategories.map(sub => (
                        <option key={sub.id} value={sub.id}>{sub.name}</option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Images */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">
                Product Images <span className="text-red-500">*</span>
                <span className="text-sm font-normal text-muted-foreground ml-2">
                  ({uploadedImages.length}/10)
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <ImageUploadZone
                onImagesUpload={newImages => {
                  setUploadedImages(prev => [...prev, ...newImages]);
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
                      <img src={url} alt={`Product ${idx + 1}`} className="w-full h-full object-cover" />
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

        </div>

        {/* ── RIGHT COLUMN (1/3 width) ── */}
        <div className="space-y-5">

          {/* Pricing */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Pricing</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">Price (Rp) <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={formData.price || ''}
                  onChange={e => set('price', parseFloat(e.target.value) || 0)}
                  className={`mt-1 ${errors.price ? 'border-red-500' : ''}`}
                  placeholder="150000"
                  min={0}
                  step={1000}
                  disabled={isLoading}
                />
                {errors.price && <p className="text-xs text-red-500 mt-1">{errors.price}</p>}
              </div>
              <div>
                <Label className="text-sm">Sale Price (Rp)</Label>
                <Input
                  type="number"
                  value={formData.sale_price !== undefined ? formData.sale_price : ''}
                  onChange={e => set('sale_price', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                  className="mt-1"
                  placeholder="100000"
                  min={0}
                  step={1000}
                  disabled={isLoading}
                />
              </div>
              <div>
                <Label className="text-sm">Discount (%)</Label>
                <Input
                  type="number"
                  value={formData.discount_percentage || ''}
                  onChange={e => set('discount_percentage', parseFloat(e.target.value) || 0)}
                  className="mt-1"
                  placeholder="0"
                  min={0}
                  max={100}
                  step={1}
                  disabled={isLoading}
                />
              </div>
            </CardContent>
          </Card>

          {/* Inventory */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Inventory</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <Label className="text-sm">Stock Quantity <span className="text-red-500">*</span></Label>
                <Input
                  type="number"
                  value={formData.stock_quantity === 0 ? '' : formData.stock_quantity}
                  onChange={e => {
                    const val = e.target.value;
                    set('stock_quantity', val === '' ? 0 : parseInt(val, 10));
                  }}
                  className={`mt-1 ${errors.stock_quantity ? 'border-red-500' : ''}`}
                  placeholder="0"
                  min={0}
                  disabled={isLoading}
                />
                {errors.stock_quantity && <p className="text-xs text-red-500 mt-1">{errors.stock_quantity}</p>}
              </div>
              <div>
                <Label className="text-sm">SKU
                  <span className="text-muted-foreground font-normal ml-1">(auto if empty)</span>
                </Label>
                <Input
                  value={formData.sku || ''}
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
              <div className="flex items-center gap-3">
                <Checkbox
                  id="is_active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) => set('is_active', checked === true)}
                  disabled={isLoading}
                />
                <div>
                  <Label htmlFor="is_active" className="text-sm font-medium cursor-pointer">
                    Active
                  </Label>
                  <p className="text-xs text-muted-foreground">Visible in the store</p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            size="lg"
            className="w-full"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {mode === 'create' ? 'Creating...' : 'Updating...'}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {mode === 'create' ? 'Create Product' : 'Update Product'}
              </>
            )}
          </Button>
        </div>
      </div>
    </motion.form>
  );
}
