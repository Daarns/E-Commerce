'use client';

import { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Maximize2, Minimize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useAuthStore } from '@/stores/auth-store';
import { useChatStore } from '@/stores/chat-store';
import { useChatSocket } from '@/hooks/use-socket';
import { ChatMessage } from '@/types/chat';
import { toast } from 'sonner';

export function ChatWidget() {
  const user = useAuthStore((state) => state.user);
  const {
    conversations,
    currentConversation,
    messages,
    isLoading,
    createConversation,
    sendMessage,
    loadConversation,
    setCurrentConversation,
    addMessage,
  } = useChatStore();

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [newConversationSubject, setNewConversationSubject] = useState('');
  const [showNewConversationForm, setShowNewConversationForm] = useState(false);

  const { isConnected } = useChatSocket(currentConversation?.id || '');

  // Auto-scroll to latest message
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Load existing conversations on widget open
  useEffect(() => {
    if (isOpen && user && conversations.length === 0) {
      useChatStore.getState().loadConversations();
    }
  }, [isOpen, user, conversations.length]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim()) return;

    if (!currentConversation) {
      toast.error('No conversation selected');
      return;
    }

    setIsSending(true);
    try {
      await sendMessage(currentConversation.id, messageInput);
      setMessageInput('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setIsSending(false);
    }
  };

  const handleStartConversation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!messageInput.trim()) {
      toast.error('Please enter a message');
      return;
    }

    setIsSending(true);
    try {
      const conversation = await createConversation(
        newConversationSubject || 'Support Request',
        messageInput
      );

      if (conversation) {
        setCurrentConversation(conversation);
        setMessageInput('');
        setNewConversationSubject('');
        setShowNewConversationForm(false);
        loadConversation(conversation.id);
      }
    } catch (error) {
      console.error('Error creating conversation:', error);
    } finally {
      setIsSending(false);
    }
  };

  if (!user) {
    return null;
  }

  return (
    <>
      {/* Chat Widget Button */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200 }}
        className="fixed bottom-6 right-6 z-40"
      >
        <Button
          onClick={() => setIsOpen(!isOpen)}
          size="lg"
          className="rounded-full h-14 w-14 shadow-lg"
          title={isOpen ? 'Close chat' : 'Open chat'}
        >
          <AnimatePresence mode="wait">
            {isOpen ? (
              <motion.div
                key="close"
                initial={{ rotate: -90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: 90, opacity: 0 }}
              >
                <X className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div
                key="open"
                initial={{ rotate: 90, opacity: 0 }}
                animate={{ rotate: 0, opacity: 1 }}
                exit={{ rotate: -90, opacity: 0 }}
              >
                <MessageCircle className="h-6 w-6" />
              </motion.div>
            )}
          </AnimatePresence>
        </Button>
      </motion.div>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            transition={{ type: 'spring', stiffness: 300 }}
            className="fixed bottom-24 right-6 w-96 bg-background border rounded-2xl shadow-2xl z-40 flex flex-col max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="bg-primary text-primary-foreground p-4 flex items-center justify-between">
              <div className="flex-1">
                <h3 className="font-semibold text-lg">Support Chat</h3>
                {currentConversation ? (
                  <p className="text-xs opacity-90">
                    {isConnected ? '🟢 Connected' : '🔴 Offline'}
                  </p>
                ) : (
                  <p className="text-xs opacity-90">Start a conversation</p>
                )}
              </div>
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
            </div>

            {!isMinimized && (
              <>
                {/* Conversation Selection or Messages */}
                {currentConversation ? (
                  <>
                    {/* Messages Display */}
                    <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                              className={`flex ${
                                msg.sender_type === 'customer' ? 'justify-end' : 'justify-start'
                              }`}
                            >
                              <div
                                className={`max-w-xs px-3 py-2 rounded-lg ${
                                  msg.sender_type === 'customer'
                                    ? 'bg-primary text-primary-foreground'
                                    : 'bg-muted'
                                }`}
                              >
                                <p className="text-sm break-words">{msg.message_text}</p>
                                <p className="text-xs opacity-70 mt-1">
                                  {new Date(msg.created_at).toLocaleTimeString([], {
                                    hour: '2-digit',
                                    minute: '2-digit',
                                  })}
                                </p>
                              </div>
                            </motion.div>
                          ))}
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
                      <div className="flex gap-2">
                        <Input
                          value={messageInput}
                          onChange={(e) => setMessageInput(e.target.value)}
                          placeholder="Type your message..."
                          disabled={isSending || !isConnected}
                          className="flex-1"
                        />
                        <Button
                          type="submit"
                          size="icon"
                          disabled={isSending || !messageInput.trim() || !isConnected}
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
                      <div className="flex-1 p-4 space-y-4">
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
                            onClick={() => {
                              setShowNewConversationForm(false);
                              setMessageInput('');
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            onClick={handleStartConversation}
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
                      <div className="flex-1 p-4 space-y-2">
                        {conversations.length > 0 ? (
                          <>
                            <p className="text-xs text-muted-foreground mb-3">
                              Select a conversation or start a new one
                            </p>
                            {conversations.slice(0, 5).map((conv) => (
                              <motion.button
                                key={conv.id}
                                whileHover={{ x: 4 }}
                                onClick={() => {
                                  setCurrentConversation(conv);
                                  loadConversation(conv.id);
                                }}
                                className="w-full text-left p-2 rounded-lg hover:bg-muted transition-colors"
                              >
                                <p className="text-sm font-medium truncate">
                                  {conv.subject || 'Support Chat'}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {conv.last_message || 'No messages'}
                                </p>
                              </motion.button>
                            ))}
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
