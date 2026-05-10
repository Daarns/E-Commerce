import { useState, useEffect } from 'react';

export interface UseVerificationCountdownReturn {
  canResend: boolean;
  resendCountdown: number;
  startCountdown: (duration?: number) => void;
  resetCountdown: () => void;
}

export const useVerificationCountdown = (): UseVerificationCountdownReturn => {
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    if (resendCountdown > 0 && !canResend) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }

    if (resendCountdown === 0 && resendCountdown > 0) {
      setCanResend(true);
    }
  }, [resendCountdown, canResend]);

  const startCountdown = (duration: number = 60) => {
    setCanResend(false);
    setResendCountdown(duration);
  };

  const resetCountdown = () => {
    setCanResend(false);
    setResendCountdown(0);
  };

  return {
    canResend,
    resendCountdown,
    startCountdown,
    resetCountdown,
  };
};
