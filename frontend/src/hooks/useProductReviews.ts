import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  productService,
  type ProductReview,
  type ReviewStats,
} from '@/services/product';

export type ProductReviewSort = 'helpful' | 'recent' | 'rating_high' | 'rating_low';

interface UseProductReviewsParams {
  productId: string;
}

interface UseProductReviewsReturn {
  reviews: ProductReview[];
  stats: ReviewStats | null;
  isLoading: boolean;
  currentPage: number;
  totalPages: number;
  sortBy: ProductReviewSort;
  showReviewForm: boolean;
  votedReviews: Record<string, 'helpful' | 'unhelpful' | null>;
  setCurrentPage: React.Dispatch<React.SetStateAction<number>>;
  setShowReviewForm: (show: boolean) => void;
  setSortBy: (sort: ProductReviewSort) => void;
  handleVote: (reviewId: string, isHelpful: boolean) => Promise<void>;
  handleReviewCreated: (newReview: ProductReview) => void;
}

export function useProductReviews({ productId }: UseProductReviewsParams): UseProductReviewsReturn {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [stats, setStats] = useState<ReviewStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [sortBy, setSortByState] = useState<ProductReviewSort>('helpful');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [votedReviews, setVotedReviews] = useState<Record<string, 'helpful' | 'unhelpful' | null>>({});

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
        setReviews(reviewsData.reviews);
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
    setReviews((previous) => [newReview, ...previous]);
    setShowReviewForm(false);
    toast.success('Review posted successfully!');
  }, []);

  const setSortBy = useCallback((sort: ProductReviewSort): void => {
    setSortByState(sort);
    setCurrentPage(1);
  }, []);

  return {
    reviews,
    stats,
    isLoading,
    currentPage,
    totalPages,
    sortBy,
    showReviewForm,
    votedReviews,
    setCurrentPage,
    setShowReviewForm,
    setSortBy,
    handleVote,
    handleReviewCreated,
  };
}
