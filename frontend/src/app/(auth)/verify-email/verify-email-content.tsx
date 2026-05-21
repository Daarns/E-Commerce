'use client';

import { useVerifyEmailForm } from '@/hooks/useVerifyEmailForm';
import { VerifyEmailForm } from '@/components/auth';

export default function VerifyEmailContent() {
  const {
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
  } = useVerifyEmailForm();

  return (
    <VerifyEmailForm
      email={email}
      code={code}
      isLoading={isLoading}
      errors={errors}
      useCodeInput={useCodeInput}
      canResend={canResend}
      resendCountdown={resendCountdown}
      onEmailChange={setEmail}
      onCodeChange={setCode}
      onSendCode={handleSendCode}
      onVerifyCode={handleVerifyCode}
      onResend={handleResend}
      onUseDifferentEmail={handleUseDifferentEmail}
    />
  );
}

