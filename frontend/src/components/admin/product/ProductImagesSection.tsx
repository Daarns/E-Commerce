import Image from 'next/image';
import { motion } from 'framer-motion';
import { AlertCircle, X } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ImageUploadZone } from '@/components/admin/product/image-upload-zone';
import type { ProductFormErrors } from '@/hooks/useAdminProductForm';

interface ProductImagesSectionProps {
  isEdit: boolean;
  isLoading: boolean;
  uploadedImages: string[];
  errors: ProductFormErrors;
  onImagesUpload: (imageUrls: string[]) => void;
  onRemoveImage: (index: number) => void;
}

export function ProductImagesSection({
  isEdit,
  isLoading,
  uploadedImages,
  errors,
  onImagesUpload,
  onRemoveImage,
}: ProductImagesSectionProps) {
  return (
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
          onImagesUpload={onImagesUpload}
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
                  sizes="(max-width: 640px) 25vw, 20vw"
                  unoptimized={url.startsWith('http://localhost')}
                />
                <button
                  type="button"
                  onClick={() => onRemoveImage(index)}
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
  );
}
