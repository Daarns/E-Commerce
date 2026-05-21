'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useLoginForm } from '@/hooks/useLoginForm';
import { LoginForm } from '@/components/auth/LoginForm';
import { VerificationDialog } from '@/components/auth/VerificationDialog';

export default function LoginPage() {
  const {
    formData,
    isLoading,
    showPassword,
    errors,
    showVerificationDialog,
    pendingEmail,
    handleSubmit,
    handleVerificationRedirect,
    setFormData,
    setShowPassword,
    setShowVerificationDialog,
  } = useLoginForm();

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  };

  return (
    <>
      <motion.div {...containerVariants} className="w-full max-w-md px-4">
        <Card className="border-0 shadow-lg">
          <CardHeader className="space-y-1 text-center">
            <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
            <CardDescription>
              Enter your credentials to access your account
            </CardDescription>
          </CardHeader>
          <form onSubmit={handleSubmit}>
            <LoginForm
              formData={formData}
              isLoading={isLoading}
              showPassword={showPassword}
              errors={errors}
              onFormDataChange={setFormData}
              onShowPasswordToggle={setShowPassword}
              onSubmit={handleSubmit}
            />
          </form>
        </Card>
      </motion.div>

      <VerificationDialog
        open={showVerificationDialog}
        pendingEmail={pendingEmail}
        onOpenChange={setShowVerificationDialog}
        onVerify={handleVerificationRedirect}
      />
    </>
  );
}
