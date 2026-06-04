'use client';

import { ReactNode, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';

interface AuthRouteGuardProps {
  children: ReactNode;
}

const AUTH_ALLOWED_PATHS_WHEN_AUTHENTICATED = new Set<string>([]);

function getAuthenticatedRedirect(role?: string, requestedRedirect?: string | null): string {
  if (requestedRedirect && requestedRedirect.startsWith('/') && !requestedRedirect.startsWith('//')) {
    return requestedRedirect;
  }

  return role === 'admin' ? '/admin' : '/';
}

export function AuthRouteGuard({ children }: AuthRouteGuardProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading || !isAuthenticated || AUTH_ALLOWED_PATHS_WHEN_AUTHENTICATED.has(pathname)) {
      return;
    }

    router.replace(getAuthenticatedRedirect(user?.role, searchParams.get('redirect')));
  }, [isAuthenticated, isLoading, pathname, router, searchParams, user?.role]);

  if (isLoading || isAuthenticated) {
    return null;
  }

  return children;
}
