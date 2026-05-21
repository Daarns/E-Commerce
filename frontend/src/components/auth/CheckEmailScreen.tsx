import { Mail, Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCountdown } from '@/utils/format';

interface CheckEmailScreenProps {
  email: string;
  isLoading: boolean;
  canResend: boolean;
  resendCountdown: number;
  onResend: () => void;
  onUseDifferentEmail: () => void;
  onBackToLogin: () => void;
}

export const CheckEmailScreen = ({
  email,
  isLoading,
  canResend,
  resendCountdown,
  onResend,
  onUseDifferentEmail,
  onBackToLogin,
}: CheckEmailScreenProps) => (
  <>
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

        <Button
          variant="outline"
          className="w-full"
          onClick={onResend}
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
          onClick={onUseDifferentEmail}
        >
          Use a different email
        </Button>
      </div>
    </CardContent>

    <CardFooter>
      <Button variant="outline" className="w-full" onClick={onBackToLogin}>
        Back to Login
      </Button>
    </CardFooter>
  </>
);
