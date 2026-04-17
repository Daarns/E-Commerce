'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle, XCircle, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { authService } from '@/services/auth';
import { toast } from 'sonner';

type VerificationStatus = 'loading' | 'success' | 'error' | 'expired';

function VerifyEmailConfirmContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [status, setStatus] = useState<VerificationStatus>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error');
        setMessage('No verification token found');
        return;
      }

      try {
        await authService.verifyEmail({ token });
        setStatus('success');
        setMessage('Your email has been successfully verified!');
        toast.success('Email verified!', {
          description: 'You can now login to your account',
        });
        
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Verification failed';
        
        if (errorMessage.includes('expired')) {
          setStatus('expired');
          setMessage('Your verification link has expired. Please request a new one.');
        } else {
          setStatus('error');
          setMessage(errorMessage);
        }
        
        toast.error('Verification failed', { description: errorMessage });
      }
    };

    verifyEmail();
  }, [token, router]);

  if (status === 'loading') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md px-4"
      >
        <Card className="border-0 shadow-lg">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="mb-4 h-12 w-12 animate-spin text-blue-600" />
            <p className="text-center text-muted-foreground">
              Verifying your email...
            </p>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  if (status === 'success') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md px-4"
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-100">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <CardTitle className="text-2xl font-bold">Email Verified!</CardTitle>
            <CardDescription>
              {message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
              <p>
                You will be redirected to the login page in a few seconds. If not, click the button below.
              </p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push('/login')}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  if (status === 'expired') {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-md px-4"
      >
        <Card className="border-0 shadow-lg">
          <CardHeader className="text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-orange-500" />
            <CardTitle className="text-2xl font-bold">Link Expired</CardTitle>
            <CardDescription>
              Your verification link has expired
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert className="border-orange-200 bg-orange-50">
              <AlertDescription className="text-orange-700">
                Verification links expire after 24 hours. Please request a new verification link.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={() => router.push('/verify-email')}>
              Request New Link
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  // Error state
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md px-4"
    >
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center">
          <XCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
          <CardTitle className="text-2xl font-bold">Verification Failed</CardTitle>
          <CardDescription>
            {message}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-red-200 bg-red-50">
            <AlertDescription className="text-red-700">
              {message || 'An error occurred while verifying your email. Please try again.'}
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter className="flex flex-col gap-2">
          <Button className="w-full" onClick={() => router.push('/verify-email')}>
            Try Again
          </Button>
          <Button variant="outline" className="w-full" onClick={() => router.push('/login')}>
            Back to Login
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}

export default function VerifyEmailConfirmPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <VerifyEmailConfirmContent />
    </Suspense>
  );
}
