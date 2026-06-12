import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

export function useSecurity() {
  const router = useRouter();
  const { logout } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handlePasswordResetRequest = async (email: string) => {
    setIsLoading(true);
    try {
      await authService.forgotPassword({ email });
      toast.success('Link reset password sudah dikirim ke email akun Anda.');
    } catch (error) {
      const axiosMsg = (error as { response?: { data?: { error?: { message?: string } } } })
        ?.response?.data?.error?.message;
      const message = axiosMsg || (error instanceof Error ? error.message : 'Gagal mengirim link reset password');
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
    handlePasswordResetRequest,
    handleDeleteAccount,
  };
}
