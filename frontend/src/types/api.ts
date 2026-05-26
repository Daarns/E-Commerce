/**
 * Shared API response wrapper — matches backend ApiResponse[T] shape.
 * Used across all service layers.
 */
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
  meta?: {
    page: number;
    limit: number;
    total: number;
    total_pages: number;
    next_cursor?: string;
    has_next?: boolean;
  };
}
