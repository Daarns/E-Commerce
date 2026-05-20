import Image from 'next/image';
import { motion } from 'framer-motion';
import { AlertCircle, X, ImageIcon } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploadZone } from '@/components/admin/product/image-upload-zone';
import type { ProductFormErrors } from '@/hooks/useAdminProductForm';

interface ProductImagesSectionProps {
  isEdit: boolean;
  isLoading: boolean;
  uploadedImages: string[];
  variantImageUrls?: string[];
  errors: ProductFormErrors;
  onImagesUpload: (imageUrls: string[]) => void;
  onRemoveImage: (index: number) => Promise<void>;
}

export function ProductImagesSection({
  isEdit,
  isLoading,
  uploadedImages,
  variantImageUrls = [],
  errors,
  onImagesUpload,
  onRemoveImage,
}: ProductImagesSectionProps) {
  const totalImages = uploadedImages.length + variantImageUrls.length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">
          Gambar Produk {!isEdit && <span className="text-red-500">*</span>}
          <span className="text-sm font-normal text-muted-foreground ml-2">
            ({totalImages}/10)
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <ImageUploadZone
          onImagesUpload={onImagesUpload}
          disabled={isLoading || totalImages >= 10}
          maxFiles={10 - totalImages}
        />
        {errors.images && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">{errors.images}</AlertDescription>
          </Alert>
        )}
        {uploadedImages.length > 0 && (
          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
            {uploadedImages.map((url, index) => (
              <motion.div
                key={`${url}-${index}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative aspect-square rounded-lg overflow-hidden bg-muted group"
              >
                <Image
                  src={url}
                  alt={`Product ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                  unoptimized={url.startsWith('http://localhost')}
                />
                <button
                  type="button"
                  onClick={() => void onRemoveImage(index)}
                  disabled={isLoading}
                  className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"
                >
                  <X className="w-5 h-5 text-white" />
                </button>
              </motion.div>
            ))}
          </div>
        )}

        {/* Variant images — read-only preview from variant section */}
        {variantImageUrls.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <ImageIcon className="w-4 h-4" />
              <span>Gambar dari Varian ({variantImageUrls.length})</span>
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {variantImageUrls.map((url, index) => (
                <div
                  key={`variant-${url}-${index}`}
                  className="relative aspect-square rounded-lg overflow-hidden bg-muted ring-1 ring-border/50"
                >
                  <Image
                    src={url}
                    alt={`Variant ${index + 1}`}
                    fill
                    className="object-cover opacity-90"
                    sizes="(max-width: 640px) 33vw, (max-width: 768px) 25vw, 20vw"
                    unoptimized={url.startsWith('http://localhost')}
                  />
                  <div className="absolute bottom-0 left-0 right-0 bg-black/40 backdrop-blur-sm text-white text-[10px] text-center py-0.5">
                    Varian
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
