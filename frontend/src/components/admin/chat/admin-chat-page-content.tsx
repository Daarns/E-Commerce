'use client';

import { Loader2, MessageSquare, RefreshCw, Search, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useAdminChat } from '@/hooks/useAdminChat';
import type { ChatMessage, ConversationStatus } from '@/types/chat';
import { cn } from '@/lib/utils';

const STATUS_OPTIONS: Array<{ value: ConversationStatus | 'all'; label: string }> = [
  { value: 'open', label: 'Open' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'resolved', label: 'Resolved' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All' },
];

const statusLabel: Record<ConversationStatus, string> = {
  open: 'Open',
  in_progress: 'In Progress',
  resolved: 'Resolved',
  closed: 'Closed',
};

function formatTime(value?: string): string {
  if (!value) return '-';
  return new Date(value).toLocaleString('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

function MessageBubble({
  message,
  currentUserId,
}: {
  message: ChatMessage;
  currentUserId?: string;
}) {
  const isMine = message.sender_id === currentUserId;

  return (
    <div className={cn('flex', isMine ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          'max-h-60 max-w-[82%] overflow-y-auto rounded-lg px-3 py-2 text-sm shadow-sm lg:max-w-[76%]',
          isMine
            ? 'bg-primary text-primary-foreground'
            : 'border bg-background text-foreground'
        )}
      >
        <p className="whitespace-pre-wrap break-words leading-6">{message.message}</p>
        <p className={cn('mt-1 text-[11px]', isMine ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
          {formatTime(message.created_at)}
        </p>
      </div>
    </div>
  );
}

function ConversationListSkeleton() {
  return (
    <div className="space-y-1 p-2">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="space-y-2 rounded-md border-b p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-36" />
              <Skeleton className="h-3 w-48" />
            </div>
            <Skeleton className="h-5 w-8 rounded-full" />
          </div>
          <Skeleton className="h-3 w-full" />
          <div className="flex items-center justify-between">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-20" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function AdminChatPageContent() {
  const {
    user,
    conversations,
    selectedConversation,
    messages,
    statusFilter,
    search,
    page,
    totalPages,
    reply,
    isLoadingList,
    isLoadingMessages,
    isLoadingOlderMessages,
    isSending,
    isSearchPending,
    hasOlderMessages,
    typingUsers,
    setSearch,
    setStatusFilter,
    setPage,
    setReply,
    selectConversation,
    handleSendReply,
    updateStatus,
    loadOlderMessages,
    refresh,
  } = useAdminChat();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Chat CS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Kelola conversation customer dari inbox support.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => void refresh()} className="gap-2">
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:h-[calc(100vh-11.5rem)] md:min-h-[520px] md:max-h-[780px] md:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="flex max-h-[34vh] min-h-[240px] flex-col overflow-hidden md:max-h-none md:min-h-0">
          <div className="space-y-3 border-b p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setPage(1);
                }}
                placeholder="Search user, email, subject..."
                className="h-9 pl-9 text-sm"
              />
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 md:flex-wrap md:overflow-visible md:pb-0">
              {STATUS_OPTIONS.map((option) => (
                <Button
                  key={option.value}
                  type="button"
                  size="sm"
                  variant={statusFilter === option.value ? 'default' : 'outline'}
                  onClick={() => {
                    setStatusFilter(option.value);
                    setPage(1);
                  }}
                  className="h-7 shrink-0 px-2 text-xs"
                >
                  {option.label}
                </Button>
              ))}
            </div>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto">
            {isLoadingList || isSearchPending ? (
              <ConversationListSkeleton />
            ) : conversations.length > 0 ? (
              conversations.map((conversation) => {
                const isActive = selectedConversation?.id === conversation.id;
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => void selectConversation(conversation)}
                    className={cn(
                      'flex w-full flex-col gap-1.5 border-b p-3 text-left transition-colors',
                      isActive ? 'bg-primary/10' : 'hover:bg-muted/70'
                    )}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold">
                          {conversation.user?.full_name ?? conversation.user?.email ?? 'Customer'}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {conversation.subject}
                        </p>
                      </div>
                      {conversation.unread_agent_count ? (
                        <Badge className="shrink-0 bg-blue-600 text-white hover:bg-blue-600">
                          {conversation.unread_agent_count}
                        </Badge>
                      ) : null}
                    </div>
                    <p className="line-clamp-2 text-xs text-muted-foreground">
                      {conversation.last_message ?? 'No message yet'}
                    </p>
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className="text-[10px]">
                        {statusLabel[conversation.status]}
                      </Badge>
                      <span className="text-[11px] text-muted-foreground">
                        {formatTime(conversation.last_message_at ?? conversation.created_at)}
                      </span>
                    </div>
                  </button>
                );
              })
            ) : (
              <div className="flex h-40 flex-col items-center justify-center gap-2 text-muted-foreground">
                <MessageSquare className="h-8 w-8" />
                <p className="text-sm">No conversations found</p>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 border-t p-3 text-sm">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage(Math.max(1, page - 1))}
            >
              Previous
            </Button>
            <span className="text-xs text-muted-foreground">
              Page {page}{totalPages ? ` of ${totalPages}` : ''}
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={totalPages > 0 ? page >= totalPages : conversations.length === 0}
              onClick={() => setPage(page + 1)}
            >
              Next
            </Button>
          </div>
        </Card>

        <Card className="flex h-[min(68vh,36rem)] min-h-[360px] flex-col overflow-hidden md:h-auto md:min-h-0">
          {selectedConversation ? (
            <>
              <div className="shrink-0 flex flex-col gap-3 border-b p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate font-semibold">
                    {selectedConversation.user?.full_name ?? selectedConversation.user?.email ?? 'Customer'}
                  </p>
                  <p className="truncate text-sm text-muted-foreground">
                    {selectedConversation.subject}
                  </p>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:overflow-visible sm:pb-0">
                  {(['in_progress', 'resolved', 'closed'] as ConversationStatus[]).map((status) => (
                    <Button
                      key={status}
                      type="button"
                      size="sm"
                      variant={selectedConversation.status === status ? 'default' : 'outline'}
                      onClick={() => void updateStatus(status)}
                      className="shrink-0"
                    >
                      {statusLabel[status]}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto bg-muted/30 p-3 sm:p-4">
                {isLoadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  </div>
                ) : messages.length > 0 ? (
                  <>
                    {hasOlderMessages ? (
                      <div className="flex justify-center">
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() => void loadOlderMessages()}
                          disabled={isLoadingOlderMessages}
                        >
                          {isLoadingOlderMessages ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : null}
                          Muat pesan lama
                        </Button>
                      </div>
                    ) : null}
                    {messages.map((message) => (
                      <MessageBubble
                        key={message.id}
                        message={message}
                        currentUserId={user?.id}
                      />
                    ))}
                    {selectedConversation && typingUsers.some((entry) => entry.conversation_id === selectedConversation.id) ? (
                      <div className="flex justify-start">
                        <div className="rounded-lg border bg-background px-3 py-2 text-xs text-muted-foreground shadow-sm">
                          Customer sedang mengetik...
                        </div>
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    No messages yet
                  </div>
                )}
              </div>

              <form onSubmit={handleSendReply} className="shrink-0 border-t p-3 sm:p-4">
                <div className="flex gap-2">
                  <Input
                    value={reply}
                    onChange={(event) => setReply(event.target.value)}
                    placeholder="Reply to customer..."
                    disabled={isSending || selectedConversation.status === 'closed'}
                  />
                  <Button
                    type="submit"
                    disabled={isSending || !reply.trim() || selectedConversation.status === 'closed'}
                    className="shrink-0 gap-2"
                  >
                    {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                    <span className="hidden sm:inline">Send</span>
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-muted-foreground">
              <MessageSquare className="h-10 w-10" />
              <p className="text-sm">Select a conversation to start replying.</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
