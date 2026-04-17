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
  token: string;
}

export interface VerifyEmailByCodeInput {
  email: string;
  code: string;
}

export interface ResendVerificationEmailInput {
  email: string;
}

export const authService = {
  async login(input: LoginInput): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/login', input);
    return response.data.data!;
  },

  async register(input: RegisterInput): Promise<AuthResponse> {
    const response = await api.post<ApiResponse<AuthResponse>>('/auth/register', input);
    return response.data.data!;
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

  async resetPassword(input: ResetPasswordInput): Promise<void> {
    await api.post('/auth/reset-password', input);
  },

  async verifyEmail(input: VerifyEmailInput): Promise<void> {
    await api.post('/auth/verify-email', input);
  },

  async verifyEmailByCode(input: VerifyEmailByCodeInput): Promise<void> {
    await api.post('/auth/verify-email-code', input);
  },

  async resendVerificationEmail(input: ResendVerificationEmailInput): Promise<void> {
    await api.post('/auth/resend-verification-email', input);
  },
};
