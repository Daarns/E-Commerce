import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  productService,
  type ReviewEligibility,
  type ProductReview,
  type ReviewStats,
} from '@/services/product';

export type ProductReviewSort = 'helpful' | 'recent' | 'rating_high' | 'rating_low';

interface UseProductReviewsParams {
  productId: string;
  canCheckEligibility?: boolean;
}

interface UseProductReviewsReturn {
  reviews: ProductReview[];
  visibleReviews: ProductReview[];
  stats: ReviewStats | null;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  sortBy: ProductReviewSort;
  ratingFilter: number | null;
  eligibility: ReviewEligibility | null;
  showReviewForm: boolean;
  votedReviews: Record<string, 'helpful' | 'unhelpful' | null>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setShowReviewForm: (show: boolean) => void;
  setSortBy: (sort: ProductReviewSort) => void;
  setRatingFilter: (rating: number | null) => void;
  handleVote: (reviewId: string, isHelpful: boolean) => Promise<void>;
  handleReviewCreated: (newReview: ProductReview) => void;
  handleLoadMore: () => void;
}

export function useProductReviews({ productId, canCheckEligibility = false }: UseProductReviewsParams): UseProductReviewsReturn {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [eligibility, setEligibility] = useState<ReviewEligibility | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortByState] = useState<ProductReviewSort>('helpful');
  const [ratingFilter, setRatingFilterState] = useState<number | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [votedReviews, setVotedReviews] = useState<Record<string, 'helpful' | 'unhelpful' | null>>({});
  const visibleReviews = ratingFilter === null
    ? reviews
    : reviews.filter((review) => review.rating === ratingFilter);

  useEffect(() => {
    let isMounted = true;

    async function fetchReviews(): Promise<void> {
      setIsLoading(true);
      try {
        const [reviewsData, statsData] = await Promise.all([
          productService.getProductReviews(productId, currentPage, 10, sortBy),
          productService.getReviewStats(productId),
        ]);

        if (!isMounted) return;
        setReviews((previous) => {
          if (currentPage === 1) return reviewsData.reviews;
          const existingIds = new Set(previous.map((review) => review.id));
          const nextReviews = reviewsData.reviews.filter((review) => !existingIds.has(review.id));
          return [...previous, ...nextReviews];
        });
        setTotalPages(reviewsData.meta.total_pages);
        setStats(statsData);
      } catch (error) {
        console.error('Failed to fetch reviews:', error);
        toast.error('Failed to load reviews');
      } finally {
        if (isMounted) setIsLoading(false);
      }
    }

    void fetchReviews();

    return () => {
      isMounted = false;
    };
  }, [productId, currentPage, sortBy]);

  useEffect(() => {
    let isMounted = true;

    async function fetchEligibility(): Promise<void> {
      setEligibility(null);
      setShowReviewForm(false);

      if (!canCheckEligibility) {
        return;
      }

      try {
        const result = await productService.getReviewEligibility(productId);
        if (isMounted) setEligibility(result);
      } catch (error) {
        console.error('Failed to fetch review eligibility:', error);
        if (isMounted) setEligibility({ can_review: false });
      }
    }

    void fetchEligibility();

    return () => {
      isMounted = false;
    };
  }, [canCheckEligibility, productId]);

  const handleVote = useCallback(async (reviewId: string, isHelpful: boolean): Promise<void> => {
    try {
      await productService.voteReviewHelpful(reviewId, isHelpful);

      setVotedReviews((previous) => ({
        ...previous,
        [reviewId]: isHelpful ? 'helpful' : 'unhelpful',
      }));

      setReviews((previous) =>
        previous.map((review) =>
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
  }, []);

  const handleReviewCreated = useCallback((newReview: ProductReview): void => {
    setShowReviewForm(false);
    if (newReview.status === 'approved') {
      setReviews((previous) => [newReview, ...previous]);
      setStats((previous) => previous ? {
        ...previous,
        total_reviews: previous.total_reviews + 1,
      } : previous);
      setEligibility({ can_review: false, reason: 'already_reviewed', order_id: newReview.order_id });
      toast.success('Review berhasil dikirim.');
      return;
    }
    toast.success('Review dikirim dan menunggu moderasi admin.');
    setEligibility({ can_review: false, reason: 'already_reviewed', order_id: newReview.order_id });
  }, []);

  const setSortBy = useCallback((sort: ProductReviewSort): void => {
    setSortByState(sort);
    setCurrentPage(1);
  }, []);

  const setRatingFilter = useCallback((rating: number | null): void => {
    setRatingFilterState(rating);
  }, []);

  const handleLoadMore = useCallback((): void => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  }, [totalPages]);

  return {
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
    setCurrentPage,
    setShowReviewForm,
    setSortBy,
    setRatingFilter,
    handleVote,
    handleReviewCreated,
    handleLoadMore,
  };
}
