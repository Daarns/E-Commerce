import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import Cookies from 'js-cookie';
import { User } from '@/types';
import { authService, LoginInput, RegisterInput } from '@/services/auth';
import { cartService } from '@/services/cart';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  
  // Actions
  login: (input: LoginInput) => Promise<void>;
  register: (input: RegisterInput) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
  setUser: (user: User | null) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (input: LoginInput) => {
        const response = await authService.login(input);
        
        // Store tokens
        Cookies.set('access_token', response.access_token, { expires: 1/96 }); // 15 min
        Cookies.set('refresh_token', response.refresh_token, { expires: 7 });
        
        set({ user: response.user, isAuthenticated: true });
        
        // Merge guest cart after login
        try {
          await cartService.mergeGuestCart();
        } catch {
          // Ignore merge errors
        }
      },

      register: async (input: RegisterInput) => {
        const response = await authService.register(input);
        
        Cookies.set('access_token', response.access_token, { expires: 1/96 });
        Cookies.set('refresh_token', response.refresh_token, { expires: 7 });
        
        set({ user: response.user, isAuthenticated: true });
      },

      logout: async () => {
        try {
          await authService.logout();
        } catch {
          // Ignore errors
        } finally {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          set({ user: null, isAuthenticated: false });
        }
      },

      checkAuth: async () => {
        set({ isLoading: true });
        
        const token = Cookies.get('access_token');
        if (!token) {
          set({ user: null, isAuthenticated: false, isLoading: false });
          return;
        }

        try {
          const user = await authService.getProfile();
          set({ user, isAuthenticated: true, isLoading: false });
        } catch {
          Cookies.remove('access_token');
          Cookies.remove('refresh_token');
          set({ user: null, isAuthenticated: false, isLoading: false });
        }
      },

      setUser: (user: User | null) => {
        set({ user, isAuthenticated: !!user });
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
);
