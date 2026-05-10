import api from '@/services/api';
import { ApiResponse, User } from '@/types';

export interface UpdateProfileInput {
  name: string;
  phone: string;
}

const userService = {
  async updateProfile(data: UpdateProfileInput): Promise<User> {
    const response = await api.put<ApiResponse<User>>('/auth/me', data);
    return response.data.data!;
  },
};

export default userService;
