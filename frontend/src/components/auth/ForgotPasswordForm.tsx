import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

interface ForgotPasswordFormProps {
  email: string;
  isLoading: boolean;
  errors: Record<string, string>;
  onEmailChange: (email: string) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const ForgotPasswordForm = ({
  email,
  isLoading,
  errors,
  onEmailChange,
  onSubmit,
}: ForgotPasswordFormProps) => (
  <>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          disabled={isLoading}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && (
          <p className="text-sm text-red-500">{errors.email}</p>
        )}
      </div>
    </CardContent>
    <CardFooter className="flex flex-col gap-4">
      <Button type="submit" className="w-full" disabled={isLoading} onClick={onSubmit}>
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
  </>
);
