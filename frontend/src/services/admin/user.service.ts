import api from '@/services/api';
import { ApiResponse, User } from '@/types';
import { AggregatedUserStats as AnalyticsUserActivity } from './analytics.service';

// ─── Admin User Types ─────────────────────────────────────────────────────────

export interface AdminUser extends User {
  last_login?: string;
  status: 'active' | 'suspended' | 'banned';
  total_orders: number;
  total_spent: number;
}

/**
 * Per-user activity log entry (admin view).
 * Note: top-level UserActivity in analytics.service is a different shape
 * (aggregated user stats). This is a single action log entry.
 */
export interface UserActivityLog {
  id: string;
  action: string;
  timestamp: string;
  details?: string;
}

export interface UserMetrics {
  total_users: number;
  active_users: number;
  suspended_users: number;
  banned_users: number;
}

export interface UserFilters {
  status?: 'active' | 'suspended' | 'banned';
  role?: 'customer' | 'admin';
  search?: string;
  createdAfter?: string;
  createdBefore?: string;
  lastLoginAfter?: string;
  lastLoginBefore?: string;
}

export interface UpdateUserRoleRequest {
  user_id: string;
  new_role: 'customer' | 'admin';
}

export interface UpdateUserStatusRequest {
  user_id: string;
  new_status: 'active' | 'suspended' | 'banned';
  reason?: string;
}

// ─── Admin User Service ───────────────────────────────────────────────────────

export const adminUserService = {
  async getUsers(
    filters?: UserFilters,
    page: number = 1,
    limit: number = 20
  ): Promise<{ data: AdminUser[]; pagination?: { page: number; limit: number; total: number; total_pages: number } }> {
    const params = new URLSearchParams();
    params.append('page', page.toString());
    params.append('limit', limit.toString());
    if (filters) {
      if (filters.status) params.append('status', filters.status);
      if (filters.role) params.append('role', filters.role);
      if (filters.search) params.append('search', filters.search);
      if (filters.createdAfter) params.append('created_after', filters.createdAfter);
      if (filters.createdBefore) params.append('created_before', filters.createdBefore);
      if (filters.lastLoginAfter) params.append('last_login_after', filters.lastLoginAfter);
      if (filters.lastLoginBefore) params.append('last_login_before', filters.lastLoginBefore);
    }

    interface UsersResponseData {
      data: AdminUser[];
      pagination?: { page: number; limit: number; total: number; total_pages: number };
    }
    const response = await api.get<ApiResponse<UsersResponseData>>(
      `/admin/users?${params.toString()}`
    );
    return {
      data: response.data.data?.data || [],
      pagination: response.data.data?.pagination,
    };
  },

  async getUser(userId: string): Promise<AdminUser> {
    const response = await api.get<ApiResponse<AdminUser>>(`/admin/users/${userId}`);
    return response.data.data!;
  },

  async updateUserRole(userId: string, newRole: 'customer' | 'admin'): Promise<AdminUser> {
    const response = await api.put<ApiResponse<AdminUser>>(`/admin/users/${userId}/role`, {
      new_role: newRole,
    });
    return response.data.data!;
  },

  async updateUserStatus(
    userId: string,
    newStatus: 'active' | 'suspended' | 'banned',
    reason?: string
  ): Promise<AdminUser> {
    const response = await api.put<ApiResponse<AdminUser>>(`/admin/users/${userId}/status`, {
      new_status: newStatus,
      reason,
    });
    return response.data.data!;
  },

  async disableUser(userId: string): Promise<{ success: boolean }> {
    const response = await api.post<{ success: boolean }>(`/admin/users/${userId}/disable`);
    return response.data;
  },

  async enableUser(userId: string): Promise<{ success: boolean }> {
    const response = await api.post<{ success: boolean }>(`/admin/users/${userId}/enable`);
    return response.data;
  },

  async getUserActivityLog(userId: string, limit: number = 20): Promise<UserActivityLog[]> {
    const response = await api.get<ApiResponse<UserActivityLog[]>>(
      `/admin/users/${userId}/activity`,
      { params: { limit } }
    );
    return response.data.data!;
  },

  async getUserActivity(
    limit: number = 20,
    offset: number = 0
  ): Promise<{ data: AnalyticsUserActivity[]; total: number }> {
    const response = await api.get<{ data: { users: AnalyticsUserActivity[]; total: number }; timestamp: string }>(
      `/admin/users/activity?limit=${limit}&offset=${offset}`
    );
    return { data: response.data.data?.users ?? [], total: response.data.data?.total ?? 0 };
  },

  async getUserMetrics(): Promise<UserMetrics> {
    const response = await api.get<ApiResponse<UserMetrics>>('/admin/users/metrics');
    return response.data.data!;
  },
};
