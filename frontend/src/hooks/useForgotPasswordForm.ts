import { useState, useEffect } from 'react';
import { authService } from '@/services/auth';
import { toast } from 'sonner';
import { validateEmail } from '@/utils/auth.validation';
import { ForgotPasswordFormState, ForgotPasswordActions } from '@/types/auth';

export const useForgotPasswordForm = (): ForgotPasswordFormState & ForgotPasswordActions => {
  const [state, setState] = useState<ForgotPasswordFormState>({
    email: '',
    isLoading: false,
    errors: {},
    submitted: false,
    canResend: false,
    resendCountdown: 0,
  });

  // Countdown timer effect
  useEffect(() => {
    if (state.resendCountdown > 0 && !state.canResend) {
      const timer = setTimeout(() => {
        setState(prev => ({ ...prev, resendCountdown: prev.resendCountdown - 1 }));
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (state.resendCountdown === 0 && state.submitted && !state.canResend) {
      setState(prev => ({ ...prev, canResend: true }));
    }
  }, [state.resendCountdown, state.canResend, state.submitted]);

  const handleRateLimitOrError = (errMsg: string): void => {
    if (errMsg.startsWith('reset_rate_limit:')) {
      const match = errMsg.match(/\d+/);
      const remaining = match ? parseInt(match[0]) : 300;
      setState(prev => ({
        ...prev,
        resendCountdown: remaining,
        canResend: false,
        submitted: true,
      }));
      toast.error('Please wait', {
        description: `You can request a new link in ${Math.ceil(remaining / 60)} minute(s).`,
      });
    } else if (errMsg) {
      toast.error('Something went wrong', { description: errMsg });
    }
  };

  const handleSubmit = async (e: React.FormEvent): Promise<void> => {
    e.preventDefault();
    const errors = validateEmail(state.email);
    if (Object.keys(errors).length > 0) {
      setState(prev => ({ ...prev, errors }));
      return;
    }

    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await authService.forgotPassword({ email: state.email });
      setState(prev => ({
        ...prev,
        submitted: true,
        canResend: false,
        resendCountdown: 300,
      }));
      toast.success('Reset link sent!', {
        description: 'Check your inbox for a link to reset your password.',
      });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: { message?: string; code?: string } } }; message?: string };
      const errMsg = axiosErr?.response?.data?.error?.message ?? axiosErr?.message ?? '';
      handleRateLimitOrError(errMsg);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const handleResend = async (): Promise<void> => {
    if (!state.canResend) return;
    setState(prev => ({ ...prev, isLoading: true }));
    try {
      await authService.resendPasswordReset(state.email);
      setState(prev => ({
        ...prev,
        canResend: false,
        resendCountdown: 300,
      }));
      toast.success('Reset link resent!', {
        description: 'Check your inbox. The new link expires in 1 hour.',
      });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: { message?: string; code?: string } } }; message?: string };
      const errMsg = axiosErr?.response?.data?.error?.message ?? axiosErr?.message ?? '';
      handleRateLimitOrError(errMsg);
    } finally {
      setState(prev => ({ ...prev, isLoading: false }));
    }
  };

  const setEmail = (email: string): void => {
    setState(prev => ({ ...prev, email, errors: {} }));
  };

  const resetForm = (): void => {
    setState({
      email: '',
      isLoading: false,
      errors: {},
      submitted: false,
      canResend: false,
      resendCountdown: 0,
    });
  };

  return {
    ...state,
    handleSubmit,
    handleResend,
    setEmail,
    resetForm,
  };
};
