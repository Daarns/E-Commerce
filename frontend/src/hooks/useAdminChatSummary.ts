'use client';

import { useCallback, useEffect, useState } from 'react';
import { chatService } from '@/services/chat';
import { useAuthStore } from '@/stores/auth-store';

const SUMMARY_REFRESH_MS = 15000;

export function useAdminChatSummary(): { unreadAgentCount: number } {
  const user = useAuthStore((state) => state.user);
  const [unreadAgentCount, setUnreadAgentCount] = useState(0);

  const loadSummary = useCallback(async (): Promise<void> => {
    if (user?.role !== 'admin') {
      return;
    }

    try {
      const summary = await chatService.getAdminSummary();
      setUnreadAgentCount(summary.unread_agent_count);
    } catch (error) {
      console.error('Failed to load admin chat summary:', error);
    }
  }, [user?.role]);

  useEffect(() => {
    if (user?.role !== 'admin') {
      return;
    }

    const initialTimer = window.setTimeout(() => {
      void loadSummary();
    }, 0);
    const timer = window.setInterval(() => {
      void loadSummary();
    }, SUMMARY_REFRESH_MS);

    return () => {
      window.clearTimeout(initialTimer);
      window.clearInterval(timer);
    };
  }, [loadSummary, user?.role]);

  return { unreadAgentCount: user?.role === 'admin' ? unreadAgentCount : 0 };
}
