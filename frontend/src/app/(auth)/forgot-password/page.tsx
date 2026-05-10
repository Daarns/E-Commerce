'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRouter } from 'next/navigation';
import { useForgotPasswordForm } from '@/hooks/useForgotPasswordForm';
import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { CheckEmailScreen } from '@/components/auth/CheckEmailScreen';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const {
    email,
    isLoading,
    errors,
    submitted,
    canResend,
    resendCountdown,
    handleSubmit,
    handleResend,
    setEmail,
    resetForm,
  } = useForgotPasswordForm();

  const handleBackToLogin = () => {
    router.push('/login');
  };

  const handleUseDifferentEmail = () => {
    resetForm();
  };

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  };

  if (submitted) {
    return (
      <motion.div {...containerVariants} className="w-full max-w-md px-4">
        <Card className="border-0 shadow-lg">
          <CheckEmailScreen
            email={email}
            isLoading={isLoading}
            canResend={canResend}
            resendCountdown={resendCountdown}
            onResend={handleResend}
            onUseDifferentEmail={handleUseDifferentEmail}
            onBackToLogin={handleBackToLogin}
          />
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div {...containerVariants} className="w-full max-w-md px-4">
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send a secure reset link
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <ForgotPasswordForm
            email={email}
            isLoading={isLoading}
            errors={errors}
            onEmailChange={setEmail}
            onSubmit={handleSubmit}
          />
        </form>
      </Card>
    </motion.div>
  );
}
