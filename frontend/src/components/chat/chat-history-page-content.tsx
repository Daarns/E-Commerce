'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, MessageCircle, Plus, Send, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatHistory } from '@/hooks/useChatHistory';
import { formatDateTime } from '@/utils/format';
import {
  getChatStatusDescription,
  getChatStatusLabel,
  isChatConversationReadOnly,
} from '@/utils/chat.utils';

export function ChatHistoryPageContent() {
  const [showMobileHistory, setShowMobileHistory] = useState(false);
  const {
    user,
    isAuthenticated,
    isAuthLoading,
    conversations,
    currentConversation,
    messages,
    isLoading,
    isSending,
    isCreatingNew,
    isLoadingOlderMessages,
    hasOlderMessages,
    messageInput,
    newConversationSubject,
    newConversationMessage,
    isCurrentConversationReadOnly,
    setMessageInput,
    setNewConversationSubject,
    setNewConversationMessage,
    selectConversation,
    sendCurrentMessage,
    openNewChat,
    cancelNewChat,
    createNewConversation,
    loadOlderMessages,
  } = useChatHistory();
  const shouldShowMobileHistory = showMobileHistory || (!currentConversation && !isCreatingNew);

  const handleSelectConversation = (conversation: Parameters<typeof selectConversation>[0]): void => {
    selectConversation(conversation);
    setShowMobileHistory(false);
  };

  const handleOpenNewChat = (): void => {
    openNewChat();
    setShowMobileHistory(false);
  };

  if (isAuthLoading) {
    return (
      <main className="container mx-auto min-h-[60vh] px-4 py-10">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Memuat riwayat chat...
        </div>
      </main>
    );
  }

  if (!isAuthenticated) {
    return (
      <main className="container mx-auto min-h-[60vh] px-4 py-10">
        <div className="max-w-xl rounded-lg border p-6">
          <h1 className="text-2xl font-semibold">Chat CS</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Login dulu untuk melihat riwayat chat dan menghubungi CS.
          </p>
          <Button asChild className="mt-5">
            <Link href="/login">Login</Link>
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="container mx-auto px-4 py-4 sm:py-6">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Chat CS</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Lihat semua percakapan bantuan dan lanjutkan chat yang masih aktif.
          </p>
        </div>
        <div className="flex gap-2 sm:w-auto">
          <Button
            type="button"
            variant="outline"
            onClick={() => setShowMobileHistory((current) => !current)}
            className="flex-1 lg:hidden"
          >
            <List className="mr-2 h-4 w-4" />
            Riwayat
          </Button>
          <Button onClick={handleOpenNewChat} className="flex-1 sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Chat Baru
          </Button>
        </div>
      </div>

      <div className="grid h-[calc(100vh-11.5rem)] min-h-[430px] max-h-[720px] overflow-hidden rounded-lg border bg-background lg:grid-cols-[340px_minmax(0,1fr)]">
        <aside className={`${shouldShowMobileHistory ? 'flex' : 'hidden'} min-h-0 flex-col border-b bg-muted/20 lg:flex lg:border-b-0 lg:border-r`}>
          <div className="border-b p-4">
            <p className="text-sm font-medium">Riwayat Percakapan</p>
            <p className="text-xs text-muted-foreground">{conversations.length} percakapan</p>
          </div>
          <div className="max-h-40 overflow-y-auto p-2 lg:max-h-none lg:flex-1">
            {isLoading && conversations.length === 0 ? (
              <div className="flex items-center gap-2 p-3 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Memuat...
              </div>
            ) : conversations.length > 0 ? (
              conversations.map((conversation) => {
                const isSelected = currentConversation?.id === conversation.id;
                const isReadOnly = isChatConversationReadOnly(conversation.status);
                return (
                  <button
                    key={conversation.id}
                    type="button"
                    onClick={() => handleSelectConversation(conversation)}
                    className={`w-full rounded-md p-3 text-left transition-colors ${
                      isSelected ? 'bg-background shadow-sm' : 'hover:bg-background/70'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-1 text-sm font-medium">
                        {conversation.subject || 'Support Chat'}
                      </p>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        isReadOnly ? 'bg-neutral-200 text-neutral-700' : 'bg-blue-100 text-blue-700'
                      }`}
                      >
                        {getChatStatusLabel(conversation.status)}
                      </span>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">
                      {conversation.last_message || 'Belum ada pesan'}
                    </p>
                    {conversation.last_message_at ? (
                      <p className="mt-2 text-[11px] text-muted-foreground">
                        {formatDateTime(conversation.last_message_at)}
                      </p>
                    ) : null}
                  </button>
                );
              })
            ) : (
              <div className="p-4 text-sm text-muted-foreground">
                Belum ada riwayat chat.
              </div>
            )}
          </div>
        </aside>

        <section className="flex min-h-0 flex-col">
          {isCreatingNew ? (
            <form onSubmit={createNewConversation} className="flex flex-1 flex-col">
              <div className="shrink-0 border-b p-4">
                <h2 className="text-lg font-semibold">Chat Baru</h2>
                <p className="text-sm text-muted-foreground">
                  Jelaskan kendala Anda, CS akan membalas dari inbox admin.
                </p>
              </div>
              <div className="flex flex-1 flex-col gap-4 p-4">
                <div>
                  <label className="text-sm font-medium">Subject</label>
                  <Input
                    value={newConversationSubject}
                    onChange={(event) => setNewConversationSubject(event.target.value)}
                    placeholder="Contoh: Barang belum sampai"
                    className="mt-1"
                  />
                </div>
                <div className="flex min-h-0 flex-1 flex-col">
                  <label className="text-sm font-medium">Pesan</label>
                  <textarea
                    value={newConversationMessage}
                    onChange={(event) => setNewConversationMessage(event.target.value)}
                    placeholder="Tulis detail kendala..."
                    className="mt-1 min-h-40 flex-1 resize-none rounded-md border bg-background px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
              <div className="flex shrink-0 gap-2 border-t p-3 sm:p-4">
                <Button type="button" variant="outline" onClick={cancelNewChat} className="flex-1">
                  Batal
                </Button>
                <Button
                  type="submit"
                  disabled={isSending || !newConversationMessage.trim()}
                  className="flex-1"
                >
                  {isSending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                  Kirim Chat
                </Button>
              </div>
            </form>
          ) : currentConversation ? (
            <>
              <div className="shrink-0 border-b p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h2 className="text-lg font-semibold">
                      {currentConversation.subject || 'Support Chat'}
                    </h2>
                    <p className="text-xs text-muted-foreground">
                      Dibuat {formatDateTime(currentConversation.created_at)}
                    </p>
                  </div>
                  <span className="w-fit rounded-full bg-muted px-3 py-1 text-xs font-medium">
                    {getChatStatusLabel(currentConversation.status)}
                  </span>
                </div>
                {isCurrentConversationReadOnly ? (
                  <p className="mt-3 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                    {getChatStatusDescription(currentConversation.status)}
                  </p>
                ) : null}
              </div>

              <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                {messages.length > 0 ? (
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
                    {messages.map((message) => {
                      const isOwnMessage = message.sender_id === user?.id;
                      return (
                        <div
                          key={message.id}
                          className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-h-52 max-w-[82%] overflow-y-auto rounded-lg px-3 py-2 sm:max-w-[78%] ${
                            isOwnMessage ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          }`}
                          >
                            <p className="break-words text-sm">{message.message}</p>
                            <p className="mt-1 text-[11px] opacity-70">
                              {formatDateTime(message.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </>
                ) : (
                  <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                    Belum ada pesan di percakapan ini.
                  </div>
                )}
              </div>

              <form onSubmit={sendCurrentMessage} className="shrink-0 border-t p-3 sm:p-4">
                <div className="flex gap-2">
                  <Input
                    value={messageInput}
                    onChange={(event) => setMessageInput(event.target.value)}
                    placeholder={isCurrentConversationReadOnly ? 'Riwayat hanya bisa dilihat' : 'Tulis pesan...'}
                    disabled={isSending || isCurrentConversationReadOnly}
                  />
                  <Button
                    type="submit"
                    size="icon"
                    disabled={isSending || isCurrentConversationReadOnly || !messageInput.trim()}
                  >
                    {isSending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mb-4 rounded-full bg-muted p-4">
                <MessageCircle className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-lg font-semibold">Pilih percakapan</h2>
              <p className="mt-1 max-w-sm text-sm text-muted-foreground">
                Pilih salah satu riwayat di samping, atau mulai chat baru jika butuh bantuan.
              </p>
              <Button onClick={handleOpenNewChat} className="mt-5">
                <Plus className="mr-2 h-4 w-4" />
                Chat Baru
              </Button>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
