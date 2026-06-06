import api from '@/services/api';
import type { ApiResponse } from '@/types/api';
import type { ProductReview } from '@/services/product';

export type AdminReviewStatus = 'all' | 'pending' | 'approved' | 'rejected';

export interface AdminReviewListResult {
  reviews: ProductReview[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

interface AdminReviewListData {
  reviews?: ProductReview[];
  total?: number;
  page?: number;
  page_size?: number;
  total_pages?: number;
}

export const adminReviewService = {
  async listReviews(status: AdminReviewStatus, page: number = 1, limit: number = 20): Promise<AdminReviewListResult> {
    const params = new URLSearchParams({
      status,
      page: String(page),
      limit: String(limit),
    });
    const response = await api.get<ApiResponse<AdminReviewListData>>(`/admin/reviews?${params}`);
    const data = response.data.data;

    return {
      reviews: data?.reviews ?? [],
      total: data?.total ?? 0,
      page: data?.page ?? page,
      page_size: data?.page_size ?? limit,
      total_pages: data?.total_pages ?? 0,
    };
  },

  async updateReviewStatus(reviewId: string, status: Exclude<AdminReviewStatus, 'all'>): Promise<ProductReview> {
    const response = await api.put<ApiResponse<ProductReview>>(`/admin/reviews/${reviewId}/status`, { status });
    return response.data.data!;
  },
};
