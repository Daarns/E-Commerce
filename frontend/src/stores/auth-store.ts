import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { User } from '@/types';
import { authService, LoginInput, RegisterInput } from '@/services/auth';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  isEmailVerified: boolean;
  
  // Actions
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
  forgotPassword: (email: string) => Promise<void>;
  resetPassword: (token: string, password: string) => Promise<void>;
  verifyEmail: (email: string, code: string) => Promise<void>;
  resendVerificationEmail: (email: string) => Promise<void>;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,
      isEmailVerified: false,

      login: async (input: LoginInput) => {
        const response = await authService.login(input);
        
        // Store tokens
        Cookies.set('access_token', response.access_token, { expires: 1/96 }); // 15 min
        Cookies.set('refresh_token', response.refresh_token, { expires: 7 });
        
        set({ user: response.user, isAuthenticated: true, isEmailVerified: response.user.is_verified, isLoading: false });
      },

      register: async (input: RegisterInput) => {
        // Register returns message and email only - user must verify email first
        await authService.register(input);
        
        // Don't set authenticated state - user needs to verify email first
        // Response contains: { message, email, user_id }
        // No tokens issued until email verification
        set({ user: null, isAuthenticated: false, isEmailVerified: false, isLoading: false });
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Ignore errors
        } finally {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          set({ user: null, isAuthenticated: false, isEmailVerified: false, isLoading: false });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });

        let token = Cookies.get('access_token');
        const refreshToken = Cookies.get('refresh_token');
        if (!token && refreshToken) {
          try {
            const response = await authService.refreshToken(refreshToken);
            Cookies.set('access_token', response.access_token, { expires: 1/96 });
            Cookies.set('refresh_token', response.refresh_token, { expires: 7 });
            token = response.access_token;
          } catch {
            Cookies.remove('access_token');
            Cookies.remove('refresh_token');
            set({ user: null, isAuthenticated: false, isLoading: false });
            return;
          }
        }

        if (!token) {
          set({ user: null, isAuthenticated: false, isEmailVerified: false, isLoading: false });
          return;
        }

        try {
          const user = await authService.getProfile();
          set({ user, isAuthenticated: true, isEmailVerified: user.is_verified, isLoading: false });
        } catch {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user, isEmailVerified: user?.is_verified ?? false });
      },

      forgotPassword: async (email: string) => {
        await authService.forgotPassword({ email });
      },

      resetPassword: async (token: string, password: string) => {
        await authService.resetPassword({ token, password });
      },

      verifyEmail: async (email: string, code: string) => {
        const response = await authService.verifyEmailByCode({ email, code });
        set({ 
          user: response.user,
          isAuthenticated: true,
          isEmailVerified: true,
          isLoading: false,
        });
      },

      resendVerificationEmail: async (email: string) => {
        await authService.resendVerificationEmail({ email });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated, isEmailVerified: state.isEmailVerified }),
    }
  )
);
