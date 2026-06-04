'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { AdminSidebar, SidebarProvider } from '@/components/admin/layout/sidebar';
import { AdminHeader } from '@/components/admin/layout/header';
import { Skeleton } from '@/components/ui/skeleton';

const LAST_NON_ADMIN_PATH_KEY = 'last_non_admin_path';

function getCustomerFallbackPath(): string {
  const fallbackPath = window.sessionStorage.getItem(LAST_NON_ADMIN_PATH_KEY);
  if (!fallbackPath || fallbackPath.startsWith('/admin')) {
    return '/';
  }

  return fallbackPath;
}

export function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, isLoading } = useAuthStore();

  useEffect(() => {
    if (isLoading) {
      return;
    }
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.replace(getCustomerFallbackPath());
      return;
    }
  }, [isAuthenticated, isLoading, user, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen bg-background">
        <div className="hidden w-72 border-r bg-card md:block" />
        <main className="flex-1 p-6 lg:p-8">
          <Skeleton className="mb-6 h-10 w-48" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
            <Skeleton className="h-28 rounded-lg" />
          </div>
          <Skeleton className="mt-6 h-96 rounded-lg" />
        </main>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return null;
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen bg-background overflow-hidden">
        {/* Sidebar */}
        <AdminSidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden min-w-0">
          {/* Header */}
          <AdminHeader />

          {/* Page Content */}
          <main className="flex-1 overflow-auto">
            <div className="p-6 lg:p-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
