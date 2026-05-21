import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

export function useSecurity() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordChange = async (current: string, newPassword: string) => {
    setIsLoading(true);
    try {
      await authService.changePassword(current, newPassword);
      toast.success('Password changed successfully. Please log in again on other devices.');
    } catch (error) {
      const axiosMsg = (error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      const message = axiosMsg || (error instanceof Error ? error.message : 'Failed to change password');
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteAccount = async (password: string) => {
    setIsLoading(true);
    try {
      await authService.deleteAccount(password);
      toast.success('Account deleted. Goodbye!');
      logout();
      router.push('/');
    } catch (error) {
      const axiosMsg = (error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      const message = axiosMsg || (error instanceof Error ? error.message : 'Failed to delete account');
      toast.error(message);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  return {
    isLoading,
    handlePasswordChange,
    handleDeleteAccount,
  };
}
