import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '@/stores/auth-store';
import Cookies from 'js-cookie';

interface SocketEvents {
  'chat:message': (message: any) => void;
  'chat:typing': (data: { conversation_id: string; user_id: string; is_typing: boolean }) => void;
  'chat:reaction': (data: { message_id: string; emoji: string; user_id: string }) => void;
  'chat:agent-assigned': (data: { conversation_id: string; agent_id: string }) => void;
  'chat:status-changed': (data: { conversation_id: string; status: string }) => void;
  'chat:connected': () => void;
  'chat:disconnected': () => void;
  'chat:error': (error: any) => void;
}

const SOCKET_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) {
      return;
    }

    const token = Cookies.get('access_token');
    if (!token) {
      return;
    }

    // Initialize Socket.io connection
    socketRef.current = io(SOCKET_URL, {
      auth: {
        token,
        userId: user.id,
      },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: 10,
      transports: ['websocket', 'polling'], // Fallback to polling if WebSocket not available
    });

    socketRef.current.on('connect', () => {
      console.log('Socket connected:', socketRef.current?.id);
    });

    socketRef.current.on('disconnect', (reason) => {
      console.log('Socket disconnected:', reason);
    });

    socketRef.current.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user]);

  const emit = useCallback(
    (event: string, data?: any) => {
      if (socketRef.current?.connected) {
        socketRef.current.emit(event, data);
      } else {
        console.warn('Socket not connected, cannot emit event:', event);
      }
    },
    []
  );

  const on = useCallback((event: string, callback: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.on(event, callback);
      return () => {
        socketRef.current?.off(event, callback);
      };
    }
  }, []);

  const off = useCallback((event: string, callback?: (...args: any[]) => void) => {
    if (socketRef.current) {
      socketRef.current.off(event, callback);
    }
  }, []);

  return {
    socket: socketRef.current,
    emit,
    on,
    off,
    isConnected: socketRef.current?.connected || false,
  };
}

// Helper hook for chat-specific events
export function useChatSocket(conversationId: string) {
  const { socket, emit, on, off, isConnected } = useSocket();

  const sendMessage = useCallback(
    (message: string) => {
      emit('chat:send-message', {
        conversation_id: conversationId,
        message_text: message,
      });
    },
    [conversationId, emit]
  );

  const setTyping = useCallback(
    (isTyping: boolean) => {
      emit('chat:typing', {
        conversation_id: conversationId,
        is_typing: isTyping,
      });
    },
    [conversationId, emit]
  );

  const addReaction = useCallback(
    (messageId: string, emoji: string) => {
      emit('chat:reaction', {
        message_id: messageId,
        emoji,
      });
    },
    [emit]
  );

  const markAsRead = useCallback(() => {
    emit('chat:mark-read', {
      conversation_id: conversationId,
    });
  }, [conversationId, emit]);

  return {
    sendMessage,
    setTyping,
    addReaction,
    markAsRead,
    on,
    off,
    isConnected,
  };
}
