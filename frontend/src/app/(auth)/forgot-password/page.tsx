'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ArrowLeft, Loader2, Mail, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/auth';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitted, setSubmitted] = useState(false);

  // Resend countdown state (mirrors verify-email pattern)
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  // Countdown timer
  useEffect(() => {
    if (resendCountdown > 0 && !canResend) {
      const timer = setTimeout(() => {
        setResendCountdown(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    if (resendCountdown === 0 && submitted && !canResend) {
      setCanResend(true);
    }
  }, [resendCountdown, canResend, submitted]);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsLoading(true);
    try {
      await authService.forgotPassword({ email });
      setSubmitted(true);
      setCanResend(false);
      setResendCountdown(300); // 5-minute cooldown (matches backend rate limit)
      toast.success('Reset link sent!', {
        description: 'Check your inbox for a link to reset your password.',
      });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: { message?: string; code?: string } } }; message?: string };
      const errMsg = axiosErr?.response?.data?.error?.message ?? axiosErr?.message ?? '';
      handleRateLimitOrError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (!canResend) return;
    setIsLoading(true);
    try {
      await authService.resendPasswordReset(email);
      setCanResend(false);
      setResendCountdown(300);
      toast.success('Reset link resent!', {
        description: 'Check your inbox. The new link expires in 1 hour.',
      });
    } catch (error: unknown) {
      const axiosErr = error as { response?: { data?: { error?: { message?: string; code?: string } } }; message?: string };
      const errMsg = axiosErr?.response?.data?.error?.message ?? axiosErr?.message ?? '';
      handleRateLimitOrError(errMsg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRateLimitOrError = (errMsg: string) => {
    if (errMsg.startsWith('reset_rate_limit:')) {
      const match = errMsg.match(/\d+/);
      const remaining = match ? parseInt(match[0]) : 300;
      setResendCountdown(remaining);
      setCanResend(false);
      setSubmitted(true); // Show the "check email" screen if not already
      toast.error('Please wait', {
        description: `You can request a new link in ${Math.ceil(remaining / 60)} minute(s).`,
      });
    } else if (errMsg) {
      toast.error('Something went wrong', { description: errMsg });
    }
  };

  const formatCountdown = (seconds: number) => {
    if (seconds >= 60) {
      const m = Math.floor(seconds / 60);
      const s = seconds % 60;
      return s > 0 ? `${m}m ${s}s` : `${m}m`;
    }
    return `${seconds}s`;
  };

  // ── "Check your email" screen ──────────────────────────────────────────
  if (submitted) {
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
            <CardTitle className="text-2xl font-bold">Check Your Email</CardTitle>
            <CardDescription>
              We&apos;ve sent a password reset link to <strong>{email}</strong>
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              <p>
                Click the link in the email to reset your password.{' '}
                <strong>The link will expire in 1 hour.</strong>
              </p>
            </div>

            <div className="rounded-lg bg-amber-50 p-3 text-xs text-amber-700 border border-amber-200">
              <p>
                🔒 <strong>Security note:</strong> The reset link is single-use. Once clicked, it cannot be used again.
              </p>
            </div>

            <div className="text-center text-sm text-muted-foreground space-y-2">
              <p>Didn&apos;t receive the email? Check your spam folder or</p>

              {/* Resend button with countdown */}
              <Button
                variant="outline"
                className="w-full"
                onClick={handleResend}
                disabled={!canResend || isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : canResend ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Resend Reset Link
                  </>
                ) : (
                  `Resend available in ${formatCountdown(resendCountdown)}`
                )}
              </Button>

              <Button
                variant="ghost"
                className="w-full text-sm"
                onClick={() => {
                  setSubmitted(false);
                  setCanResend(false);
                  setResendCountdown(0);
                  setEmail('');
                }}
              >
                Use a different email
              </Button>
            </div>
          </CardContent>

          <CardFooter>
            <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
              Back to Login
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  // ── Initial form ───────────────────────────────────────────────────────
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md px-4"
    >
      <Card className="border-0 shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Forgot Password</CardTitle>
          <CardDescription>
            Enter your email and we&apos;ll send a secure reset link
          </CardDescription>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sending...
                </>
              ) : (
                'Send Reset Link'
              )}
            </Button>
            <Link
              href="/login"
              className="flex items-center justify-center gap-2 text-sm text-muted-foreground hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </CardFooter>
        </form>
      </Card>
    </motion.div>
  );
}
