import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CardContent, CardFooter } from '@/components/ui/card';
import Link from 'next/link';
import { LoginFormData } from '@/types/auth';

interface LoginFormProps {
  formData: LoginFormData;
  isLoading: boolean;
  showPassword: boolean;
  errors: Record<string, string>;
  onFormDataChange: (data: LoginFormData) => void;
  onShowPasswordToggle: (show: boolean) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const LoginForm = ({
  formData,
  isLoading,
  showPassword,
  errors,
  onFormDataChange,
  onShowPasswordToggle,
  onSubmit,
}: LoginFormProps) => (
  <>
    <CardContent className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          placeholder="john@example.com"
          value={formData.email}
          onChange={(e) => onFormDataChange({ ...formData, email: e.target.value })}
          disabled={isLoading}
          className={errors.email ? 'border-red-500' : ''}
        />
        {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="password">Password</Label>
          <Link
            href="/forgot-password"
            className="text-sm text-primary hover:underline"
          >
            Forgot password?
          </Link>
        </div>
        <div className="relative">
          <Input
            id="password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={formData.password}
            onChange={(e) => onFormDataChange({ ...formData, password: e.target.value })}
            disabled={isLoading}
            className={errors.password ? 'border-red-500 pr-10' : 'pr-10'}
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="absolute right-0 top-0 h-full px-3"
            onClick={() => onShowPasswordToggle(!showPassword)}
          >
            {showPassword ? (
              <EyeOff className="h-4 w-4 text-muted-foreground" />
            ) : (
              <Eye className="h-4 w-4 text-muted-foreground" />
            )}
          </Button>
        </div>
        {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
      </div>
    </CardContent>

    <CardFooter className="flex flex-col gap-4">
      <Button type="submit" className="w-full" disabled={isLoading} onClick={onSubmit}>
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Signing in...
          </>
        ) : (
          'Sign In'
        )}
      </Button>
      <p className="text-sm text-center text-muted-foreground">
        Don&apos;t have an account?{' '}
        <Link href="/register" className="text-primary font-medium hover:underline">
          Sign up
        </Link>
      </p>
    </CardFooter>
  </>
);
