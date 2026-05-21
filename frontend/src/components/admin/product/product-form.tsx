'use client';

import { Loader2, Plus } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { NewCategoryModal } from '@/components/admin/product/NewCategoryModal';
import { ProductBasicInfoSection } from '@/components/admin/product/ProductBasicInfoSection';
import { ProductImagesSection } from '@/components/admin/product/ProductImagesSection';
import { ProductSidebarSection } from '@/components/admin/product/ProductSidebarSection';
import { ProductVariantsSection } from '@/components/admin/product/ProductVariantsSection';
import { useAdminProductForm, type ProductFormProps } from '@/hooks/useAdminProductForm';

const SELECT_CLASS_NAME = `mt-1 flex h-10 w-full rounded-md border bg-background px-3 py-2 text-sm
  ring-offset-background focus-visible:outline-none focus-visible:ring-2
  focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50`;

export function ProductForm(props: ProductFormProps) {
  const { isLoading = false } = props;
  const form = useAdminProductForm(props);

  return (
    <>
      <NewCategoryModal
        open={form.categoryModalOpen}
        onClose={() => form.setCategoryModalOpen(false)}
        onCreated={form.addCategory}
      />

      <motion.form
        onSubmit={(event) => void form.handleSubmit(event)}
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-5 pb-20 lg:pb-0"
      >
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2 space-y-5">
            <ProductBasicInfoSection
              formData={form.formData}
              errors={form.errors}
              categories={form.categories}
              categoriesLoading={form.categoriesLoading}
              isLoading={isLoading}
              selectClassName={SELECT_CLASS_NAME}
              onFieldChange={form.setField}
              onOpenCategoryModal={() => form.setCategoryModalOpen(true)}
            />

            <ProductImagesSection
              isEdit={form.isEdit}
              isLoading={isLoading}
              uploadedImages={form.uploadedImages}
              variantImageUrls={props.product?.variant_image_urls}
              errors={form.errors}
              onImagesUpload={form.addUploadedImages}
              onRemoveImage={form.removeUploadedImage}
            />

            <ProductVariantsSection
              variantTypes={form.variantTypes}
              combinations={form.combinations}
              stockQuantity={form.formData.stock_quantity}
              variantsOpen={form.variantsOpen}
              errors={form.errors}
              onToggleOpen={() => form.setVariantsOpen((open) => !open)}
              onAddVariantType={form.addVariantType}
              onRemoveVariantType={form.removeVariantType}
              onUpdateVariantType={form.updateVariantType}
              onAddVariantOption={form.addVariantOption}
              onRemoveVariantOption={form.removeVariantOption}
              onUpdateVariantOption={form.updateVariantOption}
              onRemoveVariantOptionImage={form.removeVariantOptionImage}
              onUpdateCombination={form.updateCombination}
            />
          </div>

          <ProductSidebarSection
            formData={form.formData}
            errors={form.errors}
            isEdit={form.isEdit}
            isLoading={isLoading}
            selectClassName={SELECT_CLASS_NAME}
            discountPercent={form.discountPercent}
            onFieldChange={form.setField}
            onDiscountPercentChange={form.setDiscountPercent}
          />
        </div>

        {/* Sticky mobile submit bar */}
        <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-background/95 backdrop-blur px-4 py-3 lg:hidden">
          <Button type="submit" disabled={isLoading} size="default" className="w-full">
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                {form.isEdit ? 'Menyimpan...' : 'Membuat...'}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {form.isEdit ? 'Simpan Perubahan' : 'Buat Produk'}
              </>
            )}
          </Button>
        </div>
      </motion.form>
    </>
  );
}
