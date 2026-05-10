import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { authService } from '@/services/auth';
import { validateResetPasswordForm } from '@/utils/auth.validation';
import { toast } from 'sonner';

export interface ResetPasswordFormState {
  formData: { password: string; confirmPassword: string };
  isLoading: boolean;
  showPassword: boolean;
  showConfirmPassword: boolean;
  errors: Record<string, string>;
  tokenInvalid: boolean;
  token: string | null;
}

export interface ResetPasswordActions {
  handleSubmit: (e: React.FormEvent) => Promise<void>;
  setFormData: (data: { password: string; confirmPassword: string }) => void;
  setShowPassword: (show: boolean) => void;
  setShowConfirmPassword: (show: boolean) => void;
  handleNewResetLink: () => void;
}

export const useResetPasswordForm = (): ResetPasswordFormState & ResetPasswordActions => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [tokenInvalid, setTokenInvalid] = useState(false);

  useEffect(() => {
    if (!token) {
      setTokenInvalid(true);
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const formErrors = validateResetPasswordForm(formData.password, formData.confirmPassword);
    setErrors(formErrors);

    if (Object.keys(formErrors).length > 0 || !token) return;

    setIsLoading(true);
    try {
      await authService.resetPassword({
        token,
        password: formData.password,
      });
      toast.success('Password reset successful!', {
        description: 'You can now login with your new password',
      });
      router.push('/login');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to reset password';
      if (errorMessage.includes('expired') || errorMessage.includes('invalid')) {
        setTokenInvalid(true);
      }
      toast.error('Error', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleNewResetLink = () => {
    router.push('/forgot-password');
  };

  return {
    formData,
    isLoading,
    showPassword,
    showConfirmPassword,
    errors,
    tokenInvalid,
    token,
    handleSubmit,
    setFormData,
    setShowPassword,
    setShowConfirmPassword,
    handleNewResetLink,
  };
};
