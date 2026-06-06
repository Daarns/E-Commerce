import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { adminReviewService, type AdminReviewStatus } from '@/services/admin';
import type { ProductReview } from '@/services/product';

const ITEMS_PER_PAGE = 20;

export function useAdminReviews() {
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [status, setStatus] = useState<AdminReviewStatus>('pending');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);

  const fetchReviews = useCallback(async (): Promise<void> => {
    setIsLoading(true);
    try {
      const result = await adminReviewService.listReviews(status, currentPage, ITEMS_PER_PAGE);
      setReviews(result.reviews);
      setTotalPages(result.total_pages);
    } catch (error) {
      console.error('Failed to load product reviews:', error);
      toast.error('Gagal memuat review produk.');
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, status]);

  useEffect(() => {
    void fetchReviews();
  }, [fetchReviews]);

  const handleStatusChange = useCallback((nextStatus: AdminReviewStatus): void => {
    setStatus(nextStatus);
    setCurrentPage(1);
  }, []);

  const moderateReview = useCallback(async (reviewId: string, nextStatus: 'approved' | 'rejected'): Promise<void> => {
    setProcessingId(reviewId);
    try {
      await adminReviewService.updateReviewStatus(reviewId, nextStatus);
      toast.success(nextStatus === 'approved' ? 'Review disetujui.' : 'Review ditolak.');
      await fetchReviews();
    } catch (error) {
      console.error('Failed to update review status:', error);
      toast.error('Gagal memperbarui status review.');
    } finally {
      setProcessingId(null);
    }
  }, [fetchReviews]);

  return {
    reviews,
    status,
    currentPage,
    totalPages,
    isLoading,
    processingId,
    setCurrentPage,
    handleStatusChange,
    moderateReview,
  };
}
