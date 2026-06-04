'use client';

import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { MessageCircle, X, Send, Loader2, Maximize2, Minimize2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChatWidget } from '@/hooks/useChatWidget';
import {
  getChatStatusDescription,
  getChatStatusLabel,
  isChatConversationReadOnly,
} from '@/utils/chat.utils';

export function ChatWidget() {
  const {
    user,
    conversations,
    currentConversation,
    messages,
    typingUsers,
    isLoading,
    isOpen,
    isMinimized,
    messageInput,
    isSending,
    newConversationSubject,
    showNewConversationForm,
    isConnected,
    messagesEndRef,
    setIsOpen,
    setIsMinimized,
    setMessageInput,
    setNewConversationSubject,
    setShowNewConversationForm,
    selectConversation,
    startNewConversation,
    cancelNewConversation,
    handleSendMessage,
    handleStartConversation,
  } = useChatWidget();

  if (!user) {
    return null;
  }

  const isConversationReadOnly = currentConversation
    ? isChatConversationReadOnly(currentConversation.status)
    : false;

  return (
    <>
      {!isOpen && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="fixed bottom-5 right-5 z-40 sm:bottom-6 sm:right-6"
        >
          <Button
            onClick={() => setIsOpen(true)}
            size="lg"
            className="h-14 w-14 rounded-full bg-neutral-950 text-white shadow-lg shadow-black/25 hover:bg-neutral-800"
            title="Open chat"
          >
            <MessageCircle className="h-6 w-6" />
          </Button>
        </motion.div>
      )}

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className={`fixed inset-x-3 bottom-4 z-40 flex flex-col overflow-hidden rounded-2xl border bg-background shadow-2xl sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-96 ${
              isMinimized ? 'h-auto' : 'h-[82vh] max-h-[640px]'
            }`}
          >
            {/* Header */}
            <div className="flex items-center justify-between bg-primary p-4 text-primary-foreground">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Support Chat</h3>
                {currentConversation ? (
                  <p className="text-xs opacity-90">
                    {getChatStatusLabel(currentConversation.status)}
                    {isConnected && !isConversationReadOnly ? ' - Realtime connected' : ''}
                  </p>
                ) : (
                  <p className="text-xs opacity-90">Start a conversation</p>
                )}
              </div>
              <div className="flex items-center gap-1">
                {currentConversation && !isMinimized ? (
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={startNewConversation}
                    className="text-primary-foreground hover:bg-primary-foreground/20"
                    title="Mulai chat baru"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                ) : null}
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  {isMinimized ? (
                    <Maximize2 className="h-4 w-4" />
                  ) : (
                    <Minimize2 className="h-4 w-4" />
                  )}
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setIsOpen(false)}
                  className="text-primary-foreground hover:bg-primary-foreground/20"
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {!isMinimized && (
              <>
                {/* Conversation Selection or Messages */}
                {currentConversation ? (
                  <>
                    {/* Messages Display */}
                    <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
                      {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                          <Loader2 className="h-6 w-6 animate-spin text-primary" />
                        </div>
                      ) : messages.length > 0 ? (
                        <>
                          {messages.map((msg) => (
                            <motion.div
                              key={msg.id}
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              className={`flex ${msg.sender_id === user.id ? 'justify-end' : 'justify-start'}`}
                            >
                              <div
                                className={`max-h-48 max-w-xs overflow-y-auto px-3 py-2 rounded-lg ${
                                  msg.sender_id === user.id
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm break-words">{msg.message}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {new Date(msg.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </motion.div>
                          ))}
                          {typingUsers.length > 0 && (
                            <div className="flex justify-start">
                              <div className="rounded-lg bg-muted px-3 py-2 text-xs text-muted-foreground">
                                CS sedang mengetik...
                              </div>
                            </div>
                          )}
                          <div ref={messagesEndRef} />
                        </>
                      ) : (
                        <div className="flex items-center justify-center h-full text-muted-foreground">
                          <p className="text-sm">No messages yet. Start typing!</p>
                        </div>
                      )}
                    </div>

                    {/* Message Input */}
                    <form onSubmit={handleSendMessage} className="border-t p-3 space-y-2">
                      {currentConversation && isConversationReadOnly && (
                        <div className="flex items-center justify-between gap-2 rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
                          <span>
                            {getChatStatusDescription(currentConversation.status)}
                          </span>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={startNewConversation}
                            className="h-8 shrink-0"
                          >
                            Baru
                          </Button>
                        </div>
                      )}
                      <div className="flex gap-2">
                        <Input
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Type your message..."
                          disabled={isSending || isConversationReadOnly}
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          disabled={isSending || isConversationReadOnly || !messageInput.trim()}
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
                  <>
                    {/* Conversation List or New Conversation Form */}
                    {showNewConversationForm ? (
                      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4">
                        <div>
                          <label className="text-sm font-medium">Subject (Optional)</label>
                          <Input
                            value={newConversationSubject}
                            onChange={(e) => setNewConversationSubject(e.target.value)}
                            placeholder="What's this about?"
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Message *</label>
                          <Input
                            value={messageInput}
                            onChange={(e) => setMessageInput(e.target.value)}
                            placeholder="Describe your issue..."
                            className="mt-1"
                          />
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={cancelNewConversation}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={() => void handleStartConversation()}
                            disabled={isSending || !messageInput.trim()}
                            className="flex-1"
                          >
                            {isSending ? (
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            Start Chat
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="min-h-0 flex-1 space-y-2 overflow-y-auto p-4">
                        {conversations.length > 0 ? (
                          <>
                            <p className="text-xs text-muted-foreground mb-3">
                              Select a conversation or start a new one
                            </p>
                            {conversations.slice(0, 5).map((conv) => (
                              <motion.button
                                key={conv.id}
                                whileHover={{ x: 4 }}
                                onClick={() => selectConversation(conv)}
                                className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
                              >
                                <p className="text-sm font-medium truncate">
                                  {conv.subject || 'Support Chat'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {conv.last_message || 'No messages'}
                                </p>
                                <span className="mt-1 inline-flex rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground">
                                  {getChatStatusLabel(conv.status)}
                                </span>
                              </motion.button>
                            ))}
                            <Button variant="outline" asChild className="mt-3 w-full">
                              <Link href="/chat" onClick={() => setIsOpen(false)}>
                                Lihat semua riwayat
                              </Link>
                            </Button>
                          </>
                        ) : null}
                        <Button
                          onClick={() => setShowNewConversationForm(true)}
                          className="w-full mt-4"
                        >
                          Start New Chat
                        </Button>
                      </div>
                    )}
                  </>
                )}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
