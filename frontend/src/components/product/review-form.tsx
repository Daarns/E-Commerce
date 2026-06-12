'use client';

import { motion } from 'framer-motion';
import { ImagePlus, Loader2, Star, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import type { ProductReview } from '@/services/product';
import { useProductReviewForm } from '@/hooks/useProductReviewForm';

interface ReviewFormProps {
  productId: string;
  onSuccess: (review: ProductReview) => void;
  onCancel: () => void;
}

export function ReviewForm({ productId, onSuccess, onCancel }: ReviewFormProps) {
  const {
    rating,
    title,
    reviewText,
    images,
    hoveredRating,
    isSubmitting,
    setRating,
    setTitle,
    setReviewText,
    handleImagesSelected,
    handleImageRemove,
    setHoveredRating,
    handleSubmit,
  } = useProductReviewForm({ productId, onSuccess });

  return (
    <motion.form
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      onSubmit={(event) => void handleSubmit(event)}
      className="space-y-6 p-6 border rounded-lg bg-muted/50"
    >
      <div>
        <Label>Rating *</Label>
        <div className="flex gap-2 mt-2">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              type="button"
              onMouseEnter={() => setHoveredRating(star)}
              onMouseLeave={() => setHoveredRating(0)}
              onClick={() => setRating(star)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-8 w-8 ${
                  star <= (hoveredRating || rating)
                    ? 'fill-amber-400 text-amber-400'
                    : 'fill-transparent text-gray-300'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="title">Judul (opsional)</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Ringkas pengalaman Anda dalam satu kalimat"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor="review">Review (opsional)</Label>
        <Textarea
          id="review"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Bagikan pengalaman Anda dengan produk ini"
          rows={5}
          disabled={isSubmitting}
        />
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor="review-images">Foto Produk (opsional)</Label>
          <p className="mt-1 text-xs text-muted-foreground">
            Maksimal 3 gambar. Gunakan foto produk jika ingin memperjelas review.
          </p>
        </div>
        <label
          htmlFor="review-images"
          className="flex min-h-20 cursor-pointer flex-col items-center justify-center rounded-lg border border-dashed border-gray-300 bg-white px-4 py-4 text-center transition-colors hover:border-gray-400"
        >
          <ImagePlus className="mb-2 h-5 w-5 text-gray-500" />
          <span className="text-sm font-medium text-gray-700">Upload foto review</span>
          <span className="text-xs text-gray-500">JPG, PNG, WebP, atau GIF</span>
        </label>
        <Input
          id="review-images"
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          disabled={isSubmitting}
          onChange={(event) => {
            const selectedImages = Array.from(event.target.files ?? []);
            handleImagesSelected(selectedImages);
            event.target.value = '';
          }}
        />
        {images.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {images.map((image, index) => (
              <span
                key={`${image.name}-${image.lastModified}-${index}`}
                className="inline-flex max-w-full items-center gap-2 rounded-full bg-gray-100 px-3 py-1 text-xs text-gray-700"
              >
                <span className="max-w-40 truncate">{image.name}</span>
                <button
                  type="button"
                  aria-label={`Remove image ${index + 1}`}
                  onClick={() => handleImageRemove(index)}
                  className="rounded-full text-gray-500 hover:text-gray-900"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Batal
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Mengirim...' : 'Kirim Review'}
        </Button>
      </div>
    </motion.form>
  );
}
