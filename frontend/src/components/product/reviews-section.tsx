'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { productService, ProductReview, ReviewStats } from '@/services/product';
import { useAuthStore } from '@/stores/auth-store';
import { formatCurrency } from '@/utils';
import { toast } from 'sonner';
import { ReviewForm } from './review-form';

interface ReviewsSectionProps {
  productId: string;
}

export function ReviewsSection({ productId }: ReviewsSectionProps) {
  const user = useAuthStore((state) => state.user);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortBy] = useState<'helpful' | 'recent' | 'rating_high' | 'rating_low'>('helpful');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [votedReviews, setVotedReviews] = useState<Record<string, 'helpful' | 'unhelpful' | null>>({});

  useEffect(() => {
    async function fetchReviews() {
      setIsLoading(true);
      try {
        const [reviewsData, statsData] = await Promise.all([
          productService.getProductReviews(productId, currentPage, 10, sortBy),
          productService.getReviewStats(productId),
        ]);
        setReviews(reviewsData.reviews);
        setTotalPages(reviewsData.meta.total_pages);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
        toast.error('Failed to load reviews');
      } finally {
        setIsLoading(false);
      }
    }

    fetchReviews();
  }, [productId, currentPage, sortBy]);

  const handleVote = async (reviewId: string, isHelpful: boolean) => {
    try {
      await productService.voteReviewHelpful(reviewId, isHelpful);
      
      setVotedReviews((prev) => ({
        ...prev,
        [reviewId]: isHelpful ? 'helpful' : 'unhelpful',
      }));

      setReviews((prev) =>
        prev.map((review) =>
          review.id === reviewId
            ? {
                ...review,
                helpful_count: isHelpful ? review.helpful_count + 1 : review.helpful_count,
                unhelpful_count: !isHelpful ? review.unhelpful_count + 1 : review.unhelpful_count,
              }
            : review
        )
      );

      toast.success(isHelpful ? 'Marked as helpful' : 'Marked as unhelpful');
    } catch (error) {
      console.error('Failed to vote:', error);
      toast.error('Failed to vote on review');
    }
  };

  const handleReviewCreated = (newReview: ProductReview) => {
    setReviews((prev) => [newReview, ...prev]);
    setShowReviewForm(false);
    toast.success('Review posted successfully!');
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Review Stats Summary */}
      {stats && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 gap-8 pb-8 border-b"
        >
          <div>
            <div className="flex items-baseline gap-3">
              <span className="text-4xl font-bold">{stats.average_rating.toFixed(1)}</span>
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-4 w-4 ${
                      i < Math.round(stats.average_rating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-muted'
                    }`}
                  />
                ))}
              </div>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Based on {stats.total_reviews} review{stats.total_reviews !== 1 ? 's' : ''}
            </p>
          </div>

          {/* Rating Breakdown */}
          <div className="space-y-2">
            {[5, 4, 3, 2, 1].map((rating) => (
              <div key={rating} className="flex items-center gap-2">
                <span className="text-sm w-12">{rating} star</span>
                <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className="h-full bg-yellow-400"
                    style={{
                      width: `${
                        stats.total_reviews > 0
                          ? ((stats.rating_breakdown[rating] || 0) / stats.total_reviews) * 100
                          : 0
                      }%`,
                    }}
                  />
                </div>
                <span className="text-sm text-muted-foreground w-8 text-right">
                  {stats.rating_breakdown[rating] || 0}
                </span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Write Review Button */}
      {user && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}>
          {showReviewForm ? (
            <ReviewForm
              productId={productId}
              onSuccess={handleReviewCreated}
              onCancel={() => setShowReviewForm(false)}
            />
          ) : (
            <Button onClick={() => setShowReviewForm(true)} className="w-full md:w-auto">
              Write a Review
            </Button>
          )}
        </motion.div>
      )}

      {/* Sort Options */}
      {reviews.length > 0 && (
        <div className="flex gap-2">
          <span className="text-sm text-muted-foreground">Sort by:</span>
          {(['helpful', 'recent', 'rating_high', 'rating_low'] as const).map((option) => (
            <Button
              key={option}
              variant={sortBy === option ? 'default' : 'outline'}
              size="sm"
              onClick={() => {
                setSortBy(option);
                setCurrentPage(1);
              }}
            >
              {option === 'helpful' && 'Most Helpful'}
              {option === 'recent' && 'Most Recent'}
              {option === 'rating_high' && 'Highest Rating'}
              {option === 'rating_low' && 'Lowest Rating'}
            </Button>
          ))}
        </div>
      )}

      {/* Reviews List */}
      <AnimatePresence mode="wait">
        {reviews.length > 0 ? (
          <div className="space-y-4">
            {reviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.05 }}
                className="p-4 rounded-lg border"
              >
                <div className="space-y-3">
                  {/* Header */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${
                              i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted'
                            }`}
                          />
                        ))}
                      </div>
                      {review.title && (
                        <h4 className="font-semibold mt-1">{review.title}</h4>
                      )}
                    </div>
                  </div>

                  {/* Review Text */}
                  {review.review_text && (
                    <p className="text-sm text-foreground">{review.review_text}</p>
                  )}

                  {/* Reviewer Info */}
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>
                      by {review.user?.name || 'Anonymous'} • {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>

                  {/* Helpful Votes */}
                  <div className="flex gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 gap-1"
                      onClick={() => handleVote(review.id, true)}
                    >
                      <ThumbsUp
                        className={`h-4 w-4 ${
                          votedReviews[review.id] === 'helpful'
                            ? 'fill-primary text-primary'
                            : ''
                        }`}
                      />
                      <span className="text-xs">{review.helpful_count}</span>
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-auto p-1 gap-1"
                      onClick={() => handleVote(review.id, false)}
                    >
                      <ThumbsDown
                        className={`h-4 w-4 ${
                          votedReviews[review.id] === 'unhelpful'
                            ? 'fill-primary text-primary'
                            : ''
                        }`}
                      />
                      <span className="text-xs">{review.unhelpful_count}</span>
                    </Button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-center py-8"
          >
            <p className="text-muted-foreground">No reviews yet. Be the first to review!</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex justify-center gap-2 pt-4">
          <Button
            variant="outline"
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Previous
          </Button>
          {[...Array(totalPages)].map((_, i) => (
            <Button
              key={i + 1}
              variant={currentPage === i + 1 ? 'default' : 'outline'}
              onClick={() => setCurrentPage(i + 1)}
            >
              {i + 1}
            </Button>
          ))}
          <Button
            variant="outline"
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
