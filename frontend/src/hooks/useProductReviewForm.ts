import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import {
  productService,
  type CreateReviewInput,
  type ProductReview,
} from '@/services/product';

interface UseProductReviewFormParams {
  productId: string;
  onSuccess: (review: ProductReview) => void;
}

interface UseProductReviewFormReturn {
  rating: number;
  title: string;
  reviewText: string;
  images: File[];
  hoveredRating: number;
  isSubmitting: boolean;
  setRating: (rating: number) => void;
  setTitle: (title: string) => void;
  setReviewText: (reviewText: string) => void;
  handleImagesSelected: (selectedImages: File[]) => void;
  handleImageRemove: (index: number) => void;
  setHoveredRating: (rating: number) => void;
  handleSubmit: (event: React.FormEvent<HTMLFormElement>) => Promise<void>;
}

export function useProductReviewForm({
  productId,
  onSuccess,
}: UseProductReviewFormParams): UseProductReviewFormReturn {
  const [rating, setRating] = useState(0);
  const [title, setTitle] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleImagesSelected = useCallback((selectedImages: File[]): void => {
    if (selectedImages.length === 0) return;

    const remainingSlots = Math.max(0, 3 - images.length);
    if (remainingSlots === 0) {
      toast.warning('Maksimal 3 foto review.');
      return;
    }

    const acceptedImages = selectedImages.slice(0, remainingSlots);
    if (acceptedImages.length < selectedImages.length) {
      toast.warning('Maksimal 3 foto review. Sebagian foto tidak ditambahkan.');
    }

    setImages((currentImages) => [...currentImages, ...acceptedImages]);
  }, [images.length]);

  const handleImageRemove = useCallback((index: number): void => {
    setImages((currentImages) => currentImages.filter((_, imageIndex) => imageIndex !== index));
  }, []);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      if (rating === 0) {
        toast.error('Pilih rating terlebih dahulu.');
        return;
      }

      setIsSubmitting(true);
      try {
        const trimmedTitle = title.trim();
        const trimmedReviewText = reviewText.trim();
        const input: CreateReviewInput = {
          rating,
          images,
        };
        if (trimmedTitle) input.title = trimmedTitle;
        if (trimmedReviewText) input.review_text = trimmedReviewText;

        const review = await productService.createReview(productId, input);
        onSuccess(review);
      } catch (error) {
        console.error('Failed to submit review:', error);
        toast.error('Review gagal dikirim. Coba beberapa saat lagi.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [images, onSuccess, productId, rating, reviewText, title]
  );

  return {
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
  };
}
