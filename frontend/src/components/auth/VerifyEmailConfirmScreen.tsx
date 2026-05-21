'use client';

import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export type VerificationStatus = 'loading' | 'success' | 'redirect' | 'error';

interface VerifyEmailConfirmScreenProps {
  status: VerificationStatus;
  message?: string;
  onGoToLogin?: () => void;
  onGoToVerify?: () => void;
}

export function VerifyEmailConfirmScreen({
  status,
  message,
  onGoToLogin,
  onGoToVerify,
}: VerifyEmailConfirmScreenProps) {
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
            <p className="text-center text-muted-foreground">Verifying your email...</p>
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
            <CardDescription>{message}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg bg-green-50 p-4 text-sm text-green-700">
              <p>You will be redirected to the login page in a few seconds. If not, click the button below.</p>
            </div>
          </CardContent>
          <CardFooter>
            <Button className="w-full" onClick={onGoToLogin}>
              Go to Login
            </Button>
          </CardFooter>
        </Card>
      </motion.div>
    );
  }

  // Default: redirect state
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="w-full max-w-md px-4"
    >
      <Card className="border-0 shadow-lg">
        <CardHeader className="text-center">
          <AlertCircle className="mx-auto mb-4 h-12 w-12 text-blue-500" />
          <CardTitle className="text-2xl font-bold">Verify Your Email</CardTitle>
          <CardDescription>
            {message || 'Please use the verification code sent to your email'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-blue-700">
              A verification code has been sent to your email address. Please enter it on the verification page.
            </AlertDescription>
          </Alert>
        </CardContent>
        <CardFooter>
          <Button className="w-full" onClick={onGoToVerify}>
            Go to Verification Page
          </Button>
        </CardFooter>
      </Card>
    </motion.div>
  );
}
