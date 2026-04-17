'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  X,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { CreateProductRequest, UpdateProductRequest, AdminProduct } from '@/services/admin';
import { categoryService } from '@/services/product';
import { Category } from '@/types';
import { ImageUploadZone } from './image-upload-zone';

interface ProductFormProps {
  mode: 'create' | 'edit';
  product?: AdminProduct;
  onSubmit: (data: any) => Promise<void>;
  isLoading?: boolean;
}

export function ProductForm({
  mode,
  product,
  onSubmit,
  isLoading = false,
}: ProductFormProps) {
  const [formData, setFormData] = useState<CreateProductRequest>({
    name: product?.name || '',
    description: product?.description || '',
    category_id: product?.category_id || '',
    subcategory_id: product?.subcategory_id || '',
    price: product?.price || 0,
    cost_price: product?.cost_price || 0,
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

  useEffect(() => {
    loadCategories();
  }, []);

  useEffect(() => {
    if (formData.category_id && categories.length > 0) {
      const selected = categories.find(c => c.id === formData.category_id);
      if (selected?.children) {
        setSubcategories(selected.children);
      } else {
        setSubcategories([]);
      }
    }
  }, [formData.category_id, categories]);

  const loadCategories = async () => {
    try {
      setCategoriesLoading(true);
      const cats = await categoryService.getCategoryTree();
      setCategories(cats);
    } catch (error) {
      console.error('Failed to load categories:', error);
      toast.error('Failed to load categories');
    } finally {
      setCategoriesLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.name.trim()) newErrors.name = 'Product name is required';
    else if (formData.name.length < 2) newErrors.name = 'Name must be at least 2 characters';
    else if (formData.name.length > 200) newErrors.name = 'Name must not exceed 200 characters';

    if (!formData.description.trim()) newErrors.description = 'Description is required';
    else if (formData.description.length < 10) newErrors.description = 'Description must be at least 10 characters';
    else if (formData.description.length > 5000) newErrors.description = 'Description must not exceed 5000 characters';

    if (!formData.category_id) newErrors.category_id = 'Category is required';

    if (formData.price <= 0) newErrors.price = 'Price must be greater than 0';
    if (formData.cost_price && formData.cost_price < 0) newErrors.cost_price = 'Cost price cannot be negative';
    if ((formData.discount_percentage ?? 0) < 0 || (formData.discount_percentage ?? 0) > 100) {
      newErrors.discount_percentage = 'Discount must be between 0 and 100';
    }

    if (formData.stock_quantity < 0) newErrors.stock_quantity = 'Stock quantity cannot be negative';

    if (formData.sku && formData.sku.length > 50) newErrors.sku = 'SKU must not exceed 50 characters';

    if (uploadedImages.length === 0) newErrors.images = 'At least one image is required';
    if (uploadedImages.length > 10) newErrors.images = 'Maximum 10 images allowed';

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast.error('Please fix the errors in the form');
      return;
    }

    try {
      await onSubmit(mode === 'edit' 
        ? { ...formData, id: product!.id }
        : formData
      );
    } catch (error) {
      console.error('Form submission error:', error);
    }
  };

  const handleInputChange = (
    field: keyof CreateProductRequest,
    value: any
  ) => {
    setFormData(prev => ({
      ...prev,
      [field]: value,
    }));

    // Auto-generate slug from name
    if (field === 'name' && !product) {
      const slug = value
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');
      setFormData(prev => ({
        ...prev,
        slug,
      }));
    }

    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
    if (errors.images) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors.images;
        return newErrors;
      });
    }
  };

  return (
    <div className="space-y-6">
      <motion.form
        onSubmit={handleSubmit}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="name">Product Name *</Label>
              <Input
                id="name"
                type="text"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                className={errors.name ? 'border-red-500' : ''}
                placeholder="Enter product name"
                disabled={isLoading}
              />
              {errors.name && <p className="text-sm text-red-500 mt-1">{errors.name}</p>}
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                className={errors.description ? 'border-red-500' : ''}
                placeholder="Enter detailed product description"
                rows={6}
                disabled={isLoading}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {formData.description.length}/5000 characters
              </p>
              {errors.description && <p className="text-sm text-red-500 mt-1">{errors.description}</p>}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category_id}
                  onValueChange={(value) => handleInputChange('category_id', value)}
                  disabled={isLoading || categoriesLoading}
                >
                  <SelectTrigger className={errors.category_id ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map(cat => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {errors.category_id && <p className="text-sm text-red-500 mt-1">{errors.category_id}</p>}
              </div>

              {subcategories.length > 0 && (
                <div>
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Select
                    value={formData.subcategory_id || ''}
                    onValueChange={(value) => handleInputChange('subcategory_id', value)}
                    disabled={isLoading}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcategory" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">None</SelectItem>
                      {subcategories.map(subcat => (
                        <SelectItem key={subcat.id} value={subcat.id}>
                          {subcat.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Pricing & Inventory */}
        <Card>
          <CardHeader>
            <CardTitle>Pricing & Inventory</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="price">Price (Rp) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) => handleInputChange('price', parseFloat(e.target.value))}
                  className={errors.price ? 'border-red-500' : ''}
                  placeholder="0"
                  min="0"
                  step="100"
                  disabled={isLoading}
                />
                {errors.price && <p className="text-sm text-red-500 mt-1">{errors.price}</p>}
              </div>

              <div>
                <Label htmlFor="cost_price">Cost Price (Rp)</Label>
                <Input
                  id="cost_price"
                  type="number"
                  value={formData.cost_price || 0}
                  onChange={(e) => handleInputChange('cost_price', parseFloat(e.target.value))}
                  className={errors.cost_price ? 'border-red-500' : ''}
                  placeholder="0"
                  min="0"
                  step="100"
                  disabled={isLoading}
                />
                {errors.cost_price && <p className="text-sm text-red-500 mt-1">{errors.cost_price}</p>}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="discount">Discount (%)</Label>
                <Input
                  id="discount"
                  type="number"
                  value={formData.discount_percentage || 0}
                  onChange={(e) => handleInputChange('discount_percentage', parseFloat(e.target.value))}
                  className={errors.discount_percentage ? 'border-red-500' : ''}
                  placeholder="0"
                  min="0"
                  max="100"
                  step="0.1"
                  disabled={isLoading}
                />
                {errors.discount_percentage && <p className="text-sm text-red-500 mt-1">{errors.discount_percentage}</p>}
              </div>

              <div>
                <Label htmlFor="stock">Stock Quantity *</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock_quantity}
                  onChange={(e) => handleInputChange('stock_quantity', parseInt(e.target.value))}
                  className={errors.stock_quantity ? 'border-red-500' : ''}
                  placeholder="0"
                  min="0"
                  disabled={isLoading}
                />
                {errors.stock_quantity && <p className="text-sm text-red-500 mt-1">{errors.stock_quantity}</p>}
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Details */}
        <Card>
          <CardHeader>
            <CardTitle>Product Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  type="text"
                  value={formData.sku || ''}
                  onChange={(e) => handleInputChange('sku', e.target.value)}
                  className={errors.sku ? 'border-red-500' : ''}
                  placeholder="e.g., PROD-001"
                  disabled={isLoading}
                />
                {errors.sku && <p className="text-sm text-red-500 mt-1">{errors.sku}</p>}
              </div>

              <div>
                <Label htmlFor="slug">Slug</Label>
                <Input
                  id="slug"
                  type="text"
                  value={formData.slug}
                  onChange={(e) => handleInputChange('slug', e.target.value)}
                  placeholder="auto-generated"
                  disabled={isLoading}
                  readOnly={mode === 'edit'}
                />
              </div>
            </div>

            <Separator />

            <div>
              <Label>Status</Label>
              <div className="flex items-center gap-2 mt-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={formData.is_active}
                  onChange={(e) => handleInputChange('is_active', e.target.checked)}
                  disabled={isLoading}
                  className="w-4 h-4"
                />
                <Label htmlFor="is_active" className="cursor-pointer mb-0">
                  Product is active
                </Label>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SEO */}
        <Card>
          <CardHeader>
            <CardTitle>SEO Settings</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="meta_title">Meta Title</Label>
              <Input
                id="meta_title"
                type="text"
                value={formData.meta_title || ''}
                onChange={(e) => handleInputChange('meta_title', e.target.value)}
                placeholder="e.g., Premium Laptop - Best Price"
                disabled={isLoading}
                maxLength={60}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(formData.meta_title || '').length}/60 characters
              </p>
            </div>

            <div>
              <Label htmlFor="meta_description">Meta Description</Label>
              <Textarea
                id="meta_description"
                value={formData.meta_description || ''}
                onChange={(e) => handleInputChange('meta_description', e.target.value)}
                placeholder="e.g., Discover our premium laptop collection..."
                rows={2}
                disabled={isLoading}
                maxLength={160}
              />
              <p className="text-xs text-muted-foreground mt-1">
                {(formData.meta_description || '').length}/160 characters
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Images */}
        <Card>
          <CardHeader>
            <CardTitle>Product Images *</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <ImageUploadZone
              onImagesUpload={(newImages) => {
                setUploadedImages(prev => [...prev, ...newImages]);
                if (errors.images) {
                  setErrors(prev => {
                    const newErrors = { ...prev };
                    delete newErrors.images;
                    return newErrors;
                  });
                }
              }}
              disabled={isLoading || uploadedImages.length >= 10}
              maxFiles={10 - uploadedImages.length}
            />

            {errors.images && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{errors.images}</AlertDescription>
              </Alert>
            )}

            {uploadedImages.length > 0 && (
              <div>
                <p className="text-sm font-medium mb-3">
                  Uploaded Images ({uploadedImages.length}/10)
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                  {uploadedImages.map((url, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.8 }}
                      className="relative aspect-square rounded-lg overflow-hidden bg-muted"
                    >
                      <img
                        src={url}
                        alt={`Product ${index + 1}`}
                        className="w-full h-full object-cover"
                      />
                      <button
                        type="button"
                        onClick={() => removeImage(index)}
                        disabled={isLoading}
                        className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded opacity-0 hover:opacity-100 transition-opacity"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </motion.div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Form Actions */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={isLoading}
            size="lg"
            className="flex-1"
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
      </motion.form>
    </div>
  );
}
