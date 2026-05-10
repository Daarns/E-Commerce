'use client';

import { Mail, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface VerifyEmailFormProps {
  email: string;
  code: string;
  isLoading: boolean;
  errors: Record<string, string>;
  useCodeInput: boolean;
  canResend: boolean;
  resendCountdown: number;
  onEmailChange: (email: string) => void;
  onCodeChange: (code: string) => void;
  onSendCode: (e: React.FormEvent) => Promise<void>;
  onVerifyCode: (e: React.FormEvent) => Promise<void>;
  onResend: (e: React.FormEvent) => Promise<void>;
  onUseDifferentEmail: () => void;
}

export function VerifyEmailForm({
  email,
  code,
  isLoading,
  errors,
  useCodeInput,
  canResend,
  resendCountdown,
  onEmailChange,
  onCodeChange,
  onSendCode,
  onVerifyCode,
  onResend,
  onUseDifferentEmail,
}: VerifyEmailFormProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md px-4"
    >
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
            <Mail className="h-6 w-6 text-blue-600" />
          </div>
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>
            {useCodeInput
              ? 'Enter the verification code sent to your email'
              : 'Enter your email address to verify your account'}
          </CardDescription>
        </CardHeader>

        <form onSubmit={useCodeInput ? onVerifyCode : onSendCode}>
          <CardContent className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => onEmailChange(e.target.value)}
                disabled={isLoading || useCodeInput}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
            </div>

            {/* Code Field */}
            {useCodeInput && (
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isLoading}
                  maxLength={6}
                  className={errors.code ? 'border-red-500' : ''}
                />
                {errors.code && <p className="text-sm text-red-500">{errors.code}</p>}
                <p className="text-xs text-muted-foreground">
                  Check your email inbox (and spam folder) for the verification code
                </p>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {useCodeInput ? 'Verifying...' : 'Sending...'}
                </>
              ) : useCodeInput ? (
                'Verify Email'
              ) : (
                'Send Verification Code'
              )}
            </Button>

            {useCodeInput && (
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full"
                  onClick={onResend}
                  disabled={!canResend || isLoading}
                >
                  {canResend ? 'Resend Code' : `Resend in ${resendCountdown}s`}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={onUseDifferentEmail}
                  disabled={isLoading}
                >
                  Use different email
                </Button>
              </>
            )}

            <Link href="/login" className="text-sm text-center text-muted-foreground hover:text-primary">
              Back to Login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
