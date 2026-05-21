import api from '@/services/api';
import type { ApiResponse, Category } from '@/types';

export interface CreateAdminCategoryRequest {
  name: string;
  description?: string;
  parent_id?: string;
  image_url?: string;
  is_active: boolean;
}

export interface UpdateAdminCategoryRequest {
  name?: string;
  description?: string;
  parent_id?: string | null;
  image_url?: string;
  is_active?: boolean;
}

export type AdminCategoryStatusFilter = 'all' | 'active' | 'inactive';

export interface AdminCategoryStats {
  total: number;
  active: number;
  inactive: number;
  root: number;
}

export interface AdminCategoryListResult {
  categories: Category[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
  stats: AdminCategoryStats;
}

export const adminCategoryService = {
  async listCategories(
    status: AdminCategoryStatusFilter = 'all',
    page: number = 1,
    limit: number = 10
  ): Promise<AdminCategoryListResult> {
    const params = new URLSearchParams({
      status,
      page: page.toString(),
      limit: limit.toString(),
    });
    const response = await api.get<ApiResponse<AdminCategoryListResult>>(
      `/admin/categories?${params.toString()}`
    );
    const data = response.data.data;
    return {
      categories: data?.categories ?? [],
      total: data?.total ?? 0,
      page: data?.page ?? page,
      limit: data?.limit ?? limit,
      total_pages: data?.total_pages ?? 0,
      stats: data?.stats ?? { total: 0, active: 0, inactive: 0, root: 0 },
    };
  },

  async createCategory(data: CreateAdminCategoryRequest): Promise<Category> {
    const response = await api.post<ApiResponse<Category>>('/admin/categories', data);
    if (!response.data.data) {
      throw new Error('Gagal membuat kategori');
    }
    return response.data.data;
  },

  async updateCategory(id: string, data: UpdateAdminCategoryRequest): Promise<Category> {
    const response = await api.put<ApiResponse<Category>>(`/admin/categories/${id}`, data);
    if (!response.data.data) {
      throw new Error('Gagal memperbarui kategori');
    }
    return response.data.data;
  },

  async deleteCategory(id: string): Promise<void> {
    await api.delete(`/admin/categories/${id}`);
  },
};
