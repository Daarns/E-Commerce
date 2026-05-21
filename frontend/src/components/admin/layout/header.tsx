'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { BurgerButton } from '@/components/admin/layout/sidebar';
import { toast } from 'sonner';

export function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      toast.success('Logged out successfully');
    } catch {
      toast.error('Failed to logout');
    }
  };

  return (
    <header className="shrink-0 border-b border-border bg-card">
      <div className="flex items-center justify-between h-[60px] px-4 gap-4">
        {/* Left: burger + page title */}
        <div className="flex items-center gap-3 min-w-0">
          <BurgerButton />
          <div className="min-w-0 hidden sm:block">
            <h2 className="text-base font-semibold leading-none truncate">
              Welcome back, {user?.name}!
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{user?.email}</p>
          </div>
        </div>

        {/* Right: actions */}
        <div className="flex items-center gap-2 shrink-0">
          <Button variant="ghost" size="icon" title="Notifications" className="relative h-8 w-8">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 bg-red-500 rounded-full" />
          </Button>

          <Button variant="ghost" size="icon" title="Settings" className="h-8 w-8">
            <Settings className="h-4 w-4" />
          </Button>

          <div className="w-px h-5 bg-border" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2 h-8 text-xs"
          >
            <LogOut className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Logout</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
