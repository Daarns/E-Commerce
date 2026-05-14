import api from '@/services/api';
import type { ApiResponse, Category } from '@/types';

export interface CreateAdminCategoryRequest {
  name: string;
  is_active: boolean;
}

export const adminCategoryService = {
  async createCategory(data: CreateAdminCategoryRequest): Promise<Category> {
    const response = await api.post<ApiResponse<Category>>('/admin/categories', data);
    if (!response.data.data) {
      throw new Error('Gagal membuat kategori');
    }
    return response.data.data;
  },
};
