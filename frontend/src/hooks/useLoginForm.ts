import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { validateLoginForm } from '@/utils/auth.validation';
import { LoginFormState, LoginActions, LoginFormData } from '@/types/auth';

export const useLoginForm = (): LoginFormState & LoginActions => {
  const router = useRouter();
  const { login } = useAuthStore();
  const [state, setState] = useState<LoginFormState>({
    formData: { email: '', password: '' },
    isLoading: false,
    showPassword: false,
    errors: {},
    showVerificationDialog: false,
    pendingEmail: '',
  });

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const errors = validateLoginForm(state.formData.email, state.formData.password);
    if (Object.keys(errors).length > 0) {
      setState(prev => ({ ...prev, errors }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await login(state.formData);
      toast.success('Welcome back!');
      router.push('/');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Invalid email or password';

      if (errorMessage.includes('EMAIL_NOT_VERIFIED') || errorMessage.includes('verify your email')) {
        setState(prev => ({
          ...prev,
          pendingEmail: state.formData.email,
          showVerificationDialog: true,
        }));
        toast.dismiss();
      } else {
        toast.error('Login failed', { description: errorMessage });
      }
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleVerificationRedirect = (): void => {
    setState(prev => ({ ...prev, showVerificationDialog: false }));
    const loadingId = toast.loading('Redirecting to email verification...');
    setTimeout(() => {
      toast.dismiss(loadingId);
      router.push(`/verify-email?email=${encodeURIComponent(state.pendingEmail)}`);
    }, 1000);
  };

  const setFormData = (formData: LoginFormData): void => {
    setState(prev => ({ ...prev, formData, errors: {} }));
  };

  const setShowPassword = (show: boolean): void => {
    setState(prev => ({ ...prev, showPassword: show }));
  };

  const setShowVerificationDialog = (show: boolean): void => {
    setState(prev => ({ ...prev, showVerificationDialog: show }));
  };

  return {
    ...state,
    handleSubmit,
    handleVerificationRedirect,
    setFormData,
    setShowPassword,
    setShowVerificationDialog,
  };
};
