'use client';

import { motion } from 'framer-motion';
import { Star, Loader2 } from 'lucide-react';
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
    hoveredRating,
    isSubmitting,
    setRating,
    setTitle,
    setReviewText,
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
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-muted'
                }`}
              />
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="title">Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="Sum up your experience in one line"
          disabled={isSubmitting}
        />
      </div>

      <div>
        <Label htmlFor="review">Your Review *</Label>
        <Textarea
          id="review"
          value={reviewText}
          onChange={(e) => setReviewText(e.target.value)}
          placeholder="Share your experience with this product..."
          rows={5}
          disabled={isSubmitting}
        />
      </div>

      <div className="flex gap-3 justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="gap-2"
        >
          {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSubmitting ? 'Posting...' : 'Post Review'}
        </Button>
      </div>
    </motion.form>
  );
}
