'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { Mail, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { authService } from '@/services/auth';
import { toast } from 'sonner';

export default function VerifyEmailContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [useCodeInput, setUseCodeInput] = useState(false);
  
  // Resend countdown state
  const [canResend, setCanResend] = useState(false);
  const [resendCountdown, setResendCountdown] = useState(0);

  useEffect(() => {
    const emailParam = searchParams.get('email');
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
      setUseCodeInput(true);
      setCanResend(false);
      setResendCountdown(60);
    }
  }, [searchParams]);

  // Countdown timer effect
  useEffect(() => {
    if (resendCountdown > 0 && !canResend) {
      const timer = setTimeout(() => {
        setResendCountdown(resendCountdown - 1);
      }, 1000);
      return () => clearTimeout(timer);
    }
    
    if (resendCountdown === 0 && useCodeInput && !canResend) {
      setCanResend(true);
    }
  }, [resendCountdown, canResend, useCodeInput]);

  const validateEmail = () => {
    const newErrors: Record<string, string> = {};
    
    if (!email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(email)) {
      newErrors.email = 'Please enter a valid email';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateCode = () => {
    const newErrors: Record<string, string> = {};
    
    if (!code) {
      newErrors.code = 'Verification code is required';
    } else if (code.length !== 6) {
      newErrors.code = 'Code must be 6 digits';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleResendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateEmail()) return;
    
    setIsLoading(true);
    try {
      await authService.resendVerificationEmail({ email });
      setUseCodeInput(true);
      setCanResend(false);
      setResendCountdown(60);
      setCode('');
      toast.success('Verification email sent!', {
        description: 'Check your inbox for the verification code',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email';
      toast.error('Error', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateCode()) return;
    
    setIsLoading(true);
    try {
      await authService.verifyEmailByCode({ email, code });
      toast.success('Email verified!', {
        description: 'You can now login to your account',
      });
      window.location.href = '/login';
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed';
      toast.error('Error', { description: errorMessage });
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendClick = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!canResend) return;
    
    setIsLoading(true);
    try {
      await authService.resendVerificationEmail({ email });
      setCanResend(false);
      setResendCountdown(60);
      setCode('');
      toast.success('Verification email sent!', {
        description: 'Check your inbox for the new verification code',
      });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to send verification email';
      
      // Check if it's a rate limit error and extract remaining seconds
      if (errorMessage.includes('RESEND_RATE_LIMIT') || errorMessage.includes('resend_rate_limit')) {
        // Try to extract remaining seconds from error message if available
        const match = errorMessage.match(/(\d+)/);
        const remainingSeconds = match ? parseInt(match[1]) : 60;
        
        setResendCountdown(remainingSeconds);
        setCanResend(false);
        toast.error('Please wait', { 
          description: `Resend available in ${remainingSeconds} seconds` 
        });
      } else {
        toast.error('Error', { description: errorMessage });
      }
    } finally {
      setIsLoading(false);
    }
  };

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

        <form onSubmit={useCodeInput ? handleVerifyCode : handleResendEmail}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={isLoading || useCodeInput}
                className={errors.email ? 'border-red-500' : ''}
              />
              {errors.email && (
                <p className="text-sm text-red-500">{errors.email}</p>
              )}
            </div>

            {useCodeInput && (
              <div className="space-y-2">
                <Label htmlFor="code">Verification Code</Label>
                <Input
                  id="code"
                  type="text"
                  placeholder="000000"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  disabled={isLoading}
                  maxLength={6}
                  className={errors.code ? 'border-red-500' : ''}
                />
                {errors.code && (
                  <p className="text-sm text-red-500">{errors.code}</p>
                )}
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
                  onClick={handleResendClick}
                  disabled={!canResend || isLoading}
                >
                  {canResend ? (
                    'Resend Code'
                  ) : (
                    `Resend in ${resendCountdown}s`
                  )}
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  className="w-full"
                  onClick={() => {
                    setUseCodeInput(false);
                    setCode('');
                    setCanResend(false);
                    setResendCountdown(0);
                  }}
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
