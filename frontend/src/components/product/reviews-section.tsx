'use client';

import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle2, ChevronDown, ThumbsUp, ThumbsDown, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useAuthStore } from '@/stores/auth-store';
import { ReviewForm } from './review-form';
import { ReviewStars } from './review-stars';
import { useProductReviews, type ProductReviewSort } from '@/hooks/useProductReviews';
import { normalizeStorageImageUrl, shouldBypassNextImageOptimizer } from '@/utils';

interface ReviewsSectionProps {
  productId: string;
}

const REVIEW_SORT_OPTIONS: ProductReviewSort[] = [
  'helpful',
  'recent',
  'rating_high',
  'rating_low',
];

const REVIEW_SORT_LABELS: Record<ProductReviewSort, string> = {
  helpful: 'Paling Membantu',
  recent: 'Terbaru',
  rating_high: 'Rating Tertinggi',
  rating_low: 'Rating Terendah',
};

export function ReviewsSection({ productId }: ReviewsSectionProps) {
  const user = useAuthStore((state) => state.user);
  const {
    reviews,
    visibleReviews,
    stats,
    eligibility,
    isLoading,
    currentPage,
    totalPages,
    sortBy,
    ratingFilter,
    showReviewForm,
    votedReviews,
    setShowReviewForm,
    setSortBy,
    setRatingFilter,
    handleVote,
    handleReviewCreated,
    handleLoadMore,
  } = useProductReviews({ productId, canCheckEligibility: Boolean(user) });

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
          className="rounded-lg border border-orange-100 bg-orange-50/60 p-5"
        >
          <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
            <div className="flex flex-col justify-center">
              <div className="flex items-end gap-1 text-orange-600">
                <span className="text-5xl font-semibold leading-none">
                  {stats.average_rating.toFixed(1)}
                </span>
                <span className="pb-1 text-lg">/ 5</span>
              </div>
              <ReviewStars rating={stats.average_rating} size="md" className="mt-2" />
              <p className="mt-2 text-sm text-muted-foreground">
                {stats.total_reviews} review disetujui
              </p>
            </div>

            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={ratingFilter === null ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setRatingFilter(null)}
                  className={ratingFilter === null ? 'bg-orange-600 hover:bg-orange-700' : 'bg-white'}
                >
                  Semua
                </Button>
                {[5, 4, 3, 2, 1].map((rating) => (
                  <Button
                    key={rating}
                    type="button"
                    variant={ratingFilter === rating ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setRatingFilter(rating)}
                    className={ratingFilter === rating ? 'bg-orange-600 hover:bg-orange-700' : 'bg-white'}
                  >
                    {rating} Bintang
                  </Button>
                ))}
              </div>

              <div className="space-y-2">
                {[5, 4, 3, 2, 1].map((rating) => (
                  <div key={rating} className="flex items-center gap-3">
                    <span className="w-16 text-sm text-gray-700">{rating} Bintang</span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-white">
                      <div
                        className="h-full bg-orange-500"
                        style={{
                          width: `${
                            stats.total_reviews > 0
                              ? ((stats.rating_breakdown[rating] || 0) / stats.total_reviews) * 100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                    <span className="w-8 text-right text-sm text-muted-foreground">
                      {stats.rating_breakdown[rating] || 0}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        {/* Write Review Button */}
        {user && eligibility?.can_review && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className={showReviewForm ? 'w-full' : undefined}
          >
            {showReviewForm ? (
              <ReviewForm
                productId={productId}
                onSuccess={handleReviewCreated}
                onCancel={() => setShowReviewForm(false)}
              />
            ) : (
              <Button onClick={() => setShowReviewForm(true)} className="w-full md:w-auto">
                Tulis Review
              </Button>
            )}
          </motion.div>
        )}

        {/* Sort Options */}
        {reviews.length > 0 && !showReviewForm && (
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm text-muted-foreground">Urutkan:</span>
            {REVIEW_SORT_OPTIONS.map((option) => (
              <Button
                key={option}
                variant={sortBy === option ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSortBy(option)}
              >
                {REVIEW_SORT_LABELS[option]}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Reviews List */}
      <AnimatePresence mode="wait">
        {visibleReviews.length > 0 ? (
          <div className="divide-y rounded-lg border bg-white">
            {visibleReviews.map((review, index) => (
              <motion.div
                key={review.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: index * 0.04 }}
                className="p-4"
              >
                <div className="space-y-3">
                  <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
                    <div>
                      <ReviewStars rating={review.rating} />
                      {review.title && (
                        <h4 className="mt-1 font-semibold text-gray-900">{review.title}</h4>
                      )}
                    </div>
                    {review.is_verified_purchase && (
                      <Badge variant="outline" className="w-fit gap-1 border-green-200 bg-green-50 text-green-700">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Pembelian terverifikasi
                      </Badge>
                    )}
                  </div>

                  {review.review_text && (
                    <p className="text-sm leading-relaxed text-gray-700">{review.review_text}</p>
                  )}

                  {review.image_urls && review.image_urls.length > 0 && (
                    <div className="grid grid-cols-3 gap-2 sm:w-fit">
                      {review.image_urls.slice(0, 3).map((imageUrl) => {
                        const normalizedImageUrl = normalizeStorageImageUrl(imageUrl);
                        if (!normalizedImageUrl) return null;

                        return (
                        <div key={imageUrl} className="relative h-20 w-full overflow-hidden rounded-md border bg-gray-50 sm:w-20">
                          <Image
                            src={normalizedImageUrl}
                            alt="Foto review produk"
                            fill
                            sizes="80px"
                            className="object-cover"
                            unoptimized={shouldBypassNextImageOptimizer(imageUrl)}
                          />
                        </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="flex flex-col gap-3 text-xs text-muted-foreground md:flex-row md:items-center md:justify-between">
                    <span>
                      oleh {review.user_name || review.user?.name || 'Anonymous'} • {new Date(review.created_at).toLocaleDateString('id-ID')}
                    </span>

                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-auto gap-1 p-1"
                        onClick={() => void handleVote(review.id, true)}
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
                        className="h-auto gap-1 p-1"
                        onClick={() => void handleVote(review.id, false)}
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
            <p className="text-muted-foreground">
              {reviews.length > 0 ? 'Tidak ada review pada filter ini.' : 'Belum ada review yang disetujui.'}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pagination */}
      {currentPage < totalPages && (
        <div className="flex justify-center pt-4">
          <Button
            variant="outline"
            className="gap-2"
            onClick={handleLoadMore}
          >
            Muat review lainnya
            <ChevronDown className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
