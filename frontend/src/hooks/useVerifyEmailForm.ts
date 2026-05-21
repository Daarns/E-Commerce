import { useState, useEffect, useCallback } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { authService } from '@/services/auth';
import { validateEmail, validateVerificationCode } from '@/utils/auth.validation';
import { useVerificationCountdown } from './useVerificationCountdown';
import { toast } from 'sonner';

export interface VerifyEmailFormState {
  email: string;
  code: string;
  isLoading: boolean;
  errors: Record<string, string>;
  useCodeInput: boolean;
  canResend: boolean;
  resendCountdown: number;
}

export interface VerifyEmailFormActions {
  setEmail: (email: string) => void;
  setCode: (code: string) => void;
  handleSendCode: (e: React.FormEvent) => Promise<void>;
  handleVerifyCode: (e: React.FormEvent) => Promise<void>;
  handleResend: (e: React.FormEvent) => Promise<void>;
  handleUseDifferentEmail: () => void;
}

export const useVerifyEmailForm = (): VerifyEmailFormState & VerifyEmailFormActions => {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { canResend, resendCountdown, startCountdown, resetCountdown } = useVerificationCountdown();

  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useCodeInput, setUseCodeInput] = useState(false);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
      setUseCodeInput(true);
      startCountdown(60);
    }
  }, [searchParams, startCountdown]);

  const handleSendCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const emailErrors = validateEmail(email);
      setErrors(emailErrors);

      if (Object.keys(emailErrors).length > 0) return;

      setIsLoading(true);
      try {
        await authService.resendVerificationEmail({ email });
        setUseCodeInput(true);
        setCode('');
        startCountdown(60);
        toast.success('Verification email sent!', {
          description: 'Check your inbox for the verification code',
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email';
        toast.error('Error', { description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    },
    [email, startCountdown]
  );

  const handleVerifyCode = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      const codeErrors = validateVerificationCode(code);
      setErrors(codeErrors);

      if (Object.keys(codeErrors).length > 0) return;

      setIsLoading(true);
      try {
        await authService.verifyEmailByCode({ email, code });
        toast.success('Email verified!', {
          description: 'You can now login to your account',
        });
        router.push('/login');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Verification failed';
        toast.error('Error', { description: errorMessage });
      } finally {
        setIsLoading(false);
      }
    },
    [email, code, router]
  );

  const handleResend = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();

      if (!canResend) return;

      setIsLoading(true);
      try {
        await authService.resendVerificationEmail({ email });
        setCode('');
        startCountdown(60);
        toast.success('Verification email sent!', {
          description: 'Check your inbox for the new verification code',
        });
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email';

        if (errorMessage.includes('RESEND_RATE_LIMIT') || errorMessage.includes('resend_rate_limit')) {
          const match = errorMessage.match(/(\d+)/);
          const remainingSeconds = match ? parseInt(match[1]) : 60;

          startCountdown(remainingSeconds);
          toast.error('Please wait', {
            description: `Resend available in ${remainingSeconds} seconds`,
          });
        } else {
          toast.error('Error', { description: errorMessage });
        }
      } finally {
        setIsLoading(false);
      }
    },
    [email, canResend, startCountdown]
  );

  const handleUseDifferentEmail = () => {
    setUseCodeInput(false);
    setCode('');
    setErrors({});
    resetCountdown();
  };

  return {
    email,
    code,
    isLoading,
    errors,
    useCodeInput,
    canResend,
    resendCountdown,
    setEmail,
    setCode,
    handleSendCode,
    handleVerifyCode,
    handleResend,
    handleUseDifferentEmail,
  };
};
