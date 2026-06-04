'use client';

import { useRouter } from 'next/navigation';
import { LogOut, Settings, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth-store';
import { BurgerButton } from '@/components/admin/layout/sidebar';
import { toast } from 'sonner';
import { useAdminChatSummary } from '@/hooks/useAdminChatSummary';
import { NotificationMenu } from '@/components/notification/notification-menu';

export function AdminHeader() {
  const router = useRouter();
  const { user, logout } = useAuthStore();
  const { unreadAgentCount } = useAdminChatSummary();

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
          <Button
            variant="ghost"
            size="icon"
            title="Chat CS"
            className="relative h-8 w-8"
            onClick={() => router.push('/admin/chat')}
          >
            <MessageSquare className="h-4 w-4" />
            {unreadAgentCount > 0 && (
              <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
                {unreadAgentCount > 99 ? '99+' : unreadAgentCount}
              </span>
            )}
          </Button>

          <NotificationMenu />

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
