'use client';

import { Bell, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useNotificationMenu } from '@/hooks/useNotificationMenu';
import { formatDateTime } from '@/utils/format';

export function NotificationMenu() {
  const {
    notifications,
    unreadCount,
    isLoading,
    markRead,
    markAllRead,
  } = useNotificationMenu();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" title="Notifications" className="relative h-8 w-8">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-blue-600 px-1 text-[10px] font-semibold leading-4 text-white">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <div className="flex items-center justify-between px-2 py-1">
          <DropdownMenuLabel className="px-0">Notifikasi</DropdownMenuLabel>
          {unreadCount > 0 && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => void markAllRead()}
              className="h-7 px-2 text-xs"
            >
              Tandai dibaca
            </Button>
          )}
        </div>
        <DropdownMenuSeparator />
        {isLoading && notifications.length === 0 ? (
          <div className="flex items-center gap-2 px-3 py-4 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Memuat...
          </div>
        ) : notifications.length > 0 ? (
          <div className="max-h-96 overflow-y-auto">
            {notifications.map((notification) => (
              <DropdownMenuItem
                key={notification.id}
                onClick={() => {
                  if (!notification.read_at) {
                    void markRead(notification.id);
                  }
                }}
                className="block cursor-pointer px-3 py-2"
              >
                <div className="flex items-start gap-2">
                  {!notification.read_at ? (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-600" />
                  ) : (
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-transparent" />
                  )}
                  <div className="min-w-0">
                    <p className="line-clamp-1 text-sm font-medium">{notification.title}</p>
                    <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
                      {notification.message}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {formatDateTime(notification.created_at)}
                    </p>
                  </div>
                </div>
              </DropdownMenuItem>
            ))}
          </div>
        ) : (
          <div className="px-3 py-6 text-center text-sm text-muted-foreground">
            Belum ada notifikasi.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
