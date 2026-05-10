'use client';

import { motion } from 'framer-motion';
import { Card } from '@/components/ui/card';
import { CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { useRegisterForm } from '@/hooks/useRegisterForm';
import { RegisterForm } from '@/components/common/RegisterForm';

export default function RegisterPage() {
  const {
    formData,
    isLoading,
    showPassword,
    errors,
    handleSubmit,
    setFormData,
    setShowPassword,
  } = useRegisterForm();

  const containerVariants = {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.4 },
  };

  return (
    <motion.div {...containerVariants} className="w-full max-w-md px-4">
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Create Account</CardTitle>
          <CardDescription>
            Enter your details to create your account
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <RegisterForm
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
  );
}
