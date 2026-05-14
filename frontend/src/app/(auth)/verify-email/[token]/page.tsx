'use client';

import { useEffect, Suspense } from 'react';
import { useRouter } from 'next/navigation';
import { VerifyEmailConfirmScreen, type VerificationStatus } from '@/components/auth';

function VerifyEmailTokenContent() {
  const router = useRouter();
  const status: VerificationStatus = 'redirect';

  useEffect(() => {
    // Token-based verification is currently not implemented
    // This page redirects to the main verify-email page with code-based verification
    const redirectTimer = setTimeout(() => {
      router.push('/verify-email');
    }, 2000);

    return () => clearTimeout(redirectTimer);
  }, [router]);

  return (
    <VerifyEmailConfirmScreen
      status={status}
      message="Please use the verification code sent to your email. Redirecting..."
      onGoToVerify={() => router.push('/verify-email')}
    />
  );
}

export default function VerifyEmailTokenPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailTokenContent />
    </Suspense>
  );
}

