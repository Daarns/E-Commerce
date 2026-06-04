'use client';

import { AdminLayout } from '@/components/admin/layout/AdminLayout';
import { AdminChatPageContent } from '@/components/admin/chat/admin-chat-page-content';

export default function AdminChatPage() {
  return (
    <AdminLayout>
      <AdminChatPageContent />
    </AdminLayout>
  );
}
