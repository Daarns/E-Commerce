'use client';

import { motion } from 'framer-motion';
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
        className="space-y-5"
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
              errors={form.errors}
              onImagesUpload={form.addUploadedImages}
              onRemoveImage={form.removeUploadedImage}
            />

            <ProductVariantsSection
              variants={form.variants}
              variantsOpen={form.variantsOpen}
              errors={form.errors}
              onToggleOpen={() => form.setVariantsOpen((open) => !open)}
              onAddVariant={form.addVariant}
              onRemoveVariant={form.removeVariant}
              onUpdateVariant={form.updateVariant}
            />
          </div>

          <ProductSidebarSection
            formData={form.formData}
            errors={form.errors}
            isEdit={form.isEdit}
            isLoading={isLoading}
            selectClassName={SELECT_CLASS_NAME}
            onFieldChange={form.setField}
          />
        </div>
      </motion.form>
    </>
  );
}
