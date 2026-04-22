import api from './api';
import { ApiResponse, AuthResponse, User } from '@/types';

export interface LoginInput {
  email: string;
  password: string;
}

export interface RegisterInput {
  email: string;
  password: string;
  name: string;
  phone?: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  password: string;
}

export interface VerifyEmailInput {
  email: string;
  code: string;
}

export interface ResendVerificationEmailInput {
  email: string;
}

/** Shape of the register API response data */
export interface RegisterResponse {
  message: string;
  email: string;
  user_id: string;
}

/** Typed axios error shape — avoids using `any` */
interface AxiosErrorShape {
  response?: {
    data?: {
      error?: {
        code?: string;
        message?: string;
      };
    };
  };
}

// Helper to extract error message from API response
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    // Cast to typed axios error shape instead of `any`
    const axiosError = error as Error & AxiosErrorShape;
    if (axiosError.response?.data?.error) {
      const errorCode = axiosError.response.data.error.code;
      if (errorCode === 'EMAIL_NOT_VERIFIED') {
        return 'EMAIL_NOT_VERIFIED';
      }
      return axiosError.response.data.error.message || error.message;
    }
    return error.message;
  }
  return 'An unknown error occurred';
}

export const authService = {
  async login(input: LoginInput): Promise<AuthResponse> {
    try {
      const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', input);
      return response.data.data!;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async register(input: RegisterInput): Promise<RegisterResponse> {
    try {
      const response = await api.post<ApiResponse<RegisterResponse>>('/auth/register', input);
      return response.data.data!;
    } catch (error) {
      throw new Error(getErrorMessage(error));
    }
  },

  async logout(): Promise<void> {
    await api.post('/auth/logout');
  },

  async getProfile(): Promise<User> {
    const response = await api.get<ApiResponse<User>>('/auth/me');
    return response.data.data!;
  },

  async refreshToken(refreshToken: string): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/refresh', {
      refresh_token: refreshToken,
    });
    return response.data.data!;
  },

  async forgotPassword(input: ForgotPasswordInput): Promise<void> {
    await api.post('/auth/forgot-password', input);
  },

  async resendPasswordReset(email: string): Promise<void> {
    await api.post('/auth/forgot-password', { email });
  },

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await api.post('/auth/reset-password', input);
  },

  async verifyEmailByCode(input: VerifyEmailInput): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/verify-email', input);
    return response.data.data!;
  },

  async resendVerificationEmail(input: ResendVerificationEmailInput): Promise<void> {
    await api.post('/auth/resend-verification-email', input);
  },

  async changePassword(currentPassword: string, newPassword: string): Promise<void> {
    await api.put('/auth/me/password', {
      current_password: currentPassword,
      new_password: newPassword,
    });
  },

  async deleteAccount(password: string): Promise<void> {
    await api.delete('/auth/me', { data: { password } });
  },
};
