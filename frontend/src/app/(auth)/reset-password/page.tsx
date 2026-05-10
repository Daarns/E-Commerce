'use client';

import { Suspense } from 'react';
import { useResetPasswordForm } from '@/hooks/useResetPasswordForm';
import { ResetPasswordForm, InvalidTokenScreen } from '@/components/auth';

function ResetPasswordContent() {
  const {
    formData,
    isLoading,
    showPassword,
    showConfirmPassword,
    errors,
    tokenInvalid,
    handleSubmit,
    setFormData,
    setShowPassword,
    setShowConfirmPassword,
    handleNewResetLink,
  } = useResetPasswordForm();

  if (tokenInvalid) {
    return <InvalidTokenScreen onRequestNewLink={handleNewResetLink} />;
  }

  return (
    <ResetPasswordForm
      formData={formData}
      isLoading={isLoading}
      showPassword={showPassword}
      showConfirmPassword={showConfirmPassword}
      errors={errors}
      onFormDataChange={setFormData}
      onShowPasswordChange={setShowPassword}
      onShowConfirmPasswordChange={setShowConfirmPassword}
      onSubmit={handleSubmit}
    />
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ResetPasswordContent />
    </Suspense>
  );
}

