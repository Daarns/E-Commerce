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
  hoveredRating: number;
  isSubmitting: boolean;
  setRating: (rating: number) => void;
  setTitle: (title: string) => void;
  setReviewText: (reviewText: string) => void;
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
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hoveredRating, setHoveredRating] = useState(0);

  const handleSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>): Promise<void> => {
      event.preventDefault();

      if (rating === 0) {
        toast.error('Please select a rating');
        return;
      }

      if (!title.trim() || !reviewText.trim()) {
        toast.error('Please fill in all fields');
        return;
      }

      setIsSubmitting(true);
      try {
        const input: CreateReviewInput = {
          rating,
          title,
          review_text: reviewText,
        };
        const review = await productService.createReview(productId, input);
        onSuccess(review);
      } catch (error) {
        console.error('Failed to submit review:', error);
        toast.error('Failed to post review. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    },
    [onSuccess, productId, rating, reviewText, title]
  );

  return {
    rating,
    title,
    reviewText,
    hoveredRating,
    isSubmitting,
    setRating,
    setTitle,
    setReviewText,
    setHoveredRating,
    handleSubmit,
  };
}
