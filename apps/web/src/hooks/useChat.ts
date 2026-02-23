import { useState, useCallback } from 'react';
import type { ChatResponse, ChatResponseMessage, DailySummary } from '../lib/types';
import { api } from '../lib/api';

interface UseChatReturn {
  messages: ChatResponseMessage[];
  sessionId: string | null;
  sessionActive: boolean;
  loading: boolean;
  error: string | null;
  dailySummary: DailySummary | null;
  sendMessage: (text: string) => Promise<void>;
  clearSession: () => void;
}

export function useChat(petId: string | null): UseChatReturn {
  const [messages, setMessages] = useState<ChatResponseMessage[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [sessionActive, setSessionActive] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dailySummary, setDailySummary] = useState<DailySummary | null>(null);

  const sendMessage = useCallback(async (text: string) => {
    if (!petId || !text.trim()) return;
    setLoading(true);
    setError(null);

    try {
      const res = await api.post<ChatResponse>('/api/chat', {
        pet_id: petId,
        message: text.trim(),
        session_id: sessionId,
      });

      setSessionId(res.session_id);
      setMessages((prev) => [...prev, ...res.messages]);
      setDailySummary(res.daily_summary);
      setSessionActive(res.session_status === 'active');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Chat failed');
    } finally {
      setLoading(false);
    }
  }, [petId, sessionId]);

  const clearSession = useCallback(() => {
    setMessages([]);
    setSessionId(null);
    setSessionActive(false);
    setError(null);
  }, []);

  return {
    messages,
    sessionId,
    sessionActive,
    loading,
    error,
    dailySummary,
    sendMessage,
    clearSession,
  };
}
