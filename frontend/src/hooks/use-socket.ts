import { useCallback, useEffect, useRef, useState } from 'react';
import Cookies from 'js-cookie';
import { useAuthStore } from '@/stores/auth-store';

type SocketPayload = Record<string, unknown>;
type SocketCallback = (payload: unknown, event: SocketEvent) => void;

interface SocketEvent {
  type: string;
  conversation_id?: string;
  payload?: SocketPayload;
  timestamp?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';

function getWebSocketUrl(token: string): string {
  const apiUrl = new URL(API_URL);
  apiUrl.protocol = apiUrl.protocol === 'https:' ? 'wss:' : 'ws:';
  apiUrl.pathname = `${apiUrl.pathname.replace(/\/$/, '')}/chat/ws`;
  apiUrl.search = new URLSearchParams({ token }).toString();
  return apiUrl.toString();
}

function isSocketEvent(value: unknown): value is SocketEvent {
  if (typeof value !== 'object' || value === null) return false;
  return 'type' in value && typeof (value as { type?: unknown }).type === 'string';
}

export function useSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const listenersRef = useRef<Map<string, Set<SocketCallback>>>(new Map());
  const [isConnected, setIsConnected] = useState(false);
  const user = useAuthStore((state) => state.user);

  useEffect(() => {
    if (!user) {
      return;
    }

    const token = Cookies.get('access_token');
    if (!token) {
      return;
    }

    const socket = new WebSocket(getWebSocketUrl(token));
    socketRef.current = socket;

    socket.onopen = () => {
      setIsConnected(true);
    };

    socket.onclose = () => {
      setIsConnected(false);
    };

    socket.onerror = () => {
      setIsConnected(false);
    };

    socket.onmessage = (messageEvent: MessageEvent<string>) => {
      try {
        const parsed: unknown = JSON.parse(messageEvent.data);
        if (!isSocketEvent(parsed)) return;

        const callbacks = listenersRef.current.get(parsed.type);
        if (!callbacks) return;

        callbacks.forEach((callback) => {
          callback(parsed.payload ?? {}, parsed);
        });
      } catch (error) {
        console.error('Failed to parse chat socket event:', error);
      }
    };

    return () => {
      socket.close();
      if (socketRef.current === socket) {
        socketRef.current = null;
      }
      setIsConnected(false);
    };
  }, [user]);

  const emit = useCallback((event: string, data?: SocketPayload): void => {
    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return;
    }

    socket.send(JSON.stringify({
      type: event,
      ...(data ?? {}),
    }));
  }, []);

  const on = useCallback((event: string, callback: SocketCallback): (() => void) => {
    const callbacks = listenersRef.current.get(event) ?? new Set<SocketCallback>();
    callbacks.add(callback);
    listenersRef.current.set(event, callbacks);

    return () => {
      callbacks.delete(callback);
      if (callbacks.size === 0) {
        listenersRef.current.delete(event);
      }
    };
  }, []);

  const off = useCallback((event: string, callback?: SocketCallback): void => {
    if (!callback) {
      listenersRef.current.delete(event);
      return;
    }

    const callbacks = listenersRef.current.get(event);
    callbacks?.delete(callback);
  }, []);

  return {
    emit,
    on,
    off,
    isConnected,
  };
}

export function useChatSocket(conversationId: string) {
  const { emit, on, off, isConnected } = useSocket();

  const joinConversation = useCallback((): void => {
    if (!conversationId) return;
    emit('conversation:join', {
      conversation_id: conversationId,
    });
  }, [conversationId, emit]);

  const setTyping = useCallback(
    (isTyping: boolean): void => {
      if (!conversationId) return;
      emit('typing:update', {
        conversation_id: conversationId,
        is_typing: isTyping,
      });
    },
    [conversationId, emit]
  );

  const markAsRead = useCallback((): void => {
    if (!conversationId) return;
    emit('read:updated', {
      conversation_id: conversationId,
    });
  }, [conversationId, emit]);

  return {
    joinConversation,
    setTyping,
    markAsRead,
    on,
    off,
    isConnected,
  };
}
