'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Bell, Settings } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { toast } from 'sonner';

export function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuthStore();

  const handleLogout = async () => {
    try {
      await logout();
      router.push('/login');
      toast.success('Logged out successfully');
    } catch (error) {
      toast.error('Failed to logout');
    }
  };

  return (
    <header className="border-b border-border bg-card">
      <div className="flex items-center justify-between p-4 px-8">
        <div>
          <h2 className="text-xl font-semibold">Welcome back, {user?.name}!</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>

        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            title="Notifications"
            className="relative"
          >
            <Bell className="h-5 w-5" />
            <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            title="Settings"
          >
            <Settings className="h-5 w-5" />
          </Button>

          <div className="w-px h-6 bg-border" />

          <Button
            variant="outline"
            size="sm"
            onClick={handleLogout}
            className="gap-2"
          >
            <LogOut className="h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>
    </header>
  );
}
