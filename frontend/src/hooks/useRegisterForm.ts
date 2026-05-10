import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';
import { validateRegisterForm } from '@/utils/auth.validation';
import { RegisterFormState, RegisterActions, RegisterFormData } from '@/types/auth';

export const useRegisterForm = (): RegisterFormState & RegisterActions => {
  const router = useRouter();
  const { register } = useAuthStore();
  const [state, setState] = useState<RegisterFormState>({
    formData: { name: '', email: '', password: '', phone: '' },
    isLoading: false,
    showPassword: false,
    errors: {},
  });

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();

    const errors = validateRegisterForm(
      state.formData.name,
      state.formData.email,
      state.formData.password
    );
    if (Object.keys(errors).length > 0) {
      setState(prev => ({ ...prev, errors }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await register(state.formData);
      toast.success('Account created!', {
        description: 'Please verify your email to activate your account',
      });
      router.push(`/verify-email?email=${encodeURIComponent(state.formData.email)}`);
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Registration failed';
      toast.error('Registration failed', { description: errorMessage });
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const setFormData = (formData: RegisterFormData): void => {
    setState(prev => ({ ...prev, formData, errors: {} }));
  };

  const setShowPassword = (show: boolean): void => {
    setState(prev => ({ ...prev, showPassword: show }));
  };

  return {
    ...state,
    handleSubmit,
    setFormData,
    setShowPassword,
  };
};
