import { useState, useEffect } from 'react';

export interface UseVerificationCountdownReturn {
  canResend: boolean;
  resendCountdown: number;
  startCountdown: (duration?: number) => void;
  resetCountdown: () => void;
}

export const useVerificationCountdown = (): UseVerificationCountdownReturn => {
  const [resendCountdown, setResendCountdown] = useState(0);
  const canResend = resendCountdown === 0;

  useEffect(() => {
    if (resendCountdown <= 0) return;

    const timer = setTimeout(() => {
      setResendCountdown((current) => Math.max(current - 1, 0));
    }, 1000);

    return () => clearTimeout(timer);
  }, [resendCountdown]);

  const startCountdown = (duration: number = 60) => {
    setResendCountdown(duration);
  };

  const resetCountdown = () => {
    setResendCountdown(0);
  };

  return {
    canResend,
    resendCountdown,
    startCountdown,
    resetCountdown,
  };
};
