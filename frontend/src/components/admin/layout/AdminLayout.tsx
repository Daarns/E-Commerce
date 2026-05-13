'use client';

import { ReactNode, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/stores/auth-store';
import { AdminSidebar, SidebarProvider } from '@/components/admin/layout/sidebar';
import { AdminHeader } from '@/components/admin/layout/header';

export function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated || !user) {
      router.push('/login');
      return;
    }
    if (user.role !== 'admin') {
      router.push('/');
      return;
    }
  }, [isAuthenticated, user, router]);

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
