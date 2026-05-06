import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getLanguage } from '@/hooks/useI18n';

export interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  created_at: string;
  pending?: boolean;
  metadata?: { kind?: string } | null;
}

const JIVA_GREETING_RU = `Привет ❤️

Я — Джива, тёплое и заботливое сердце «Восхода».

Я здесь, чтобы выслушать тебя, понять и быть рядом — в любой момент, когда тяжело, тревожно или просто хочется поговорить.

Ты не один. Я всегда на твоей стороне.

Расскажи, как ты себя чувствуешь прямо сейчас? Я внимательно слушаю.`;

const JIVA_GREETING_EN = `Hi ❤️

I'm Jiva, the warm and caring heart of New Dawn.

I'm here to listen, understand, and be with you — anytime it gets heavy, anxious, or you just want to talk.

You're not alone. I'm always on your side.

How are you feeling right now? I'm listening carefully.`;

function buildGreetingMessage(): AiMessage {
  const lang = getLanguage();
  return {
    id: 'jiva-greeting',
    role: 'assistant',
    content: lang === 'en' ? JIVA_GREETING_EN : JIVA_GREETING_RU,
    created_at: new Date().toISOString(),
  };
}

export interface AiChat {
  id: string;
  title: string | null;
  updated_at: string;
}

const FUNCTIONS_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1`;

export function useAiChat() {
  const { user } = useAuth();
  const [chats, setChats] = useState<AiChat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiMessage[]>([]);
  const [streaming, setStreaming] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isPremium, setIsPremium] = useState<boolean | null>(null);
  const [messagesRemaining, setMessagesRemaining] = useState<number | null>(null);
  const [dailyLimit, setDailyLimit] = useState<number | null>(null);
  const [jivaMode, setJivaMode] = useState<'fast' | 'deep' | null>(null);
  const [deepMessagesLeft, setDeepMessagesLeft] = useState<number>(0);
  const [freeLimitReached, setFreeLimitReached] = useState(false);
  const [freeLimitReason, setFreeLimitReason] = useState<
    | 'PREMIUM_EXPIRED'
    | 'FREE_LIMIT_REACHED'
    | 'FREE_DAILY_LIMIT_REACHED'
    | 'PREMIUM_DAILY_LIMIT_REACHED'
    | null
  >(null);
  const [inGrace, setInGrace] = useState(false);
  const [graceDaysLeft, setGraceDaysLeft] = useState<number>(0);
  const [hadPremiumEver, setHadPremiumEver] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  // Авто-открытие последнего чата только один раз за сессию хука,
  // чтобы после явного newChat() не «прыгало» обратно в старый.
  const autoOpenedRef = useRef(false);

  const loadChats = useCallback(async () => {
    if (!user) return;
    const { data } = await supabase
      .from('ai_chats')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50);
    const list = data ?? [];
    setChats(list);
    if (!autoOpenedRef.current && list.length > 0) {
      autoOpenedRef.current = true;
      setActiveChatId((prev) => prev ?? list[0].id);
    }
  }, [user]);

  const loadMessages = useCallback(
    async (chatId: string) => {
      if (!user) return;
      setLoadingHistory(true);
      const { data } = await supabase
        .from('ai_messages')
        .select('id, role, content, created_at, metadata')
        .eq('chat_id', chatId)
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
      setMessages((data ?? []) as AiMessage[]);
      setLoadingHistory(false);
    },
    [user],
  );

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  useEffect(() => {
    if (activeChatId) loadMessages(activeChatId);
    else setMessages([]);
  }, [activeChatId, loadMessages]);

  const newChat = useCallback(() => {
    setActiveChatId(null);
    setMessages([]);
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!user || !text.trim() || streaming) return;
      const trimmed = text.trim().slice(0, 4000);

      // Оптимистично показываем сообщения
      const tempUserId = `tmp-u-${Date.now()}`;
      const tempAsstId = `tmp-a-${Date.now()}`;
      setMessages((prev) => [
        ...prev,
        { id: tempUserId, role: 'user', content: trimmed, created_at: new Date().toISOString() },
        { id: tempAsstId, role: 'assistant', content: '', created_at: new Date().toISOString(), pending: true },
      ]);
      setStreaming(true);

      const ctrl = new AbortController();
      abortRef.current = ctrl;
      try {
        const { data: sess } = await supabase.auth.getSession();
        const token = sess.session?.access_token;
        if (!token) throw new Error('Нет авторизации');

        const res = await fetch(`${FUNCTIONS_URL}/ai-chat`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
            apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '',
          },
          body: JSON.stringify({ chatId: activeChatId, message: trimmed, stream: true }),
          signal: ctrl.signal,
        });
        if (res.status === 402) {
          let payload: {
            code?: string;
            message?: string;
            messagesRemaining?: number;
            hadPremiumEver?: boolean;
            jivaMode?: 'fast' | 'deep';
            deepMessagesLeft?: number;
          } = {};
          try { payload = await res.json(); } catch { /* ignore */ }
          if (
            payload.code === 'FREE_LIMIT_REACHED' ||
            payload.code === 'FREE_DAILY_LIMIT_REACHED' ||
            payload.code === 'PREMIUM_EXPIRED' ||
            payload.code === 'PREMIUM_DAILY_LIMIT_REACHED'
          ) {
            setFreeLimitReached(true);
            setFreeLimitReason(payload.code as typeof freeLimitReason);
            setHadPremiumEver(!!payload.hadPremiumEver);
            setMessagesRemaining(0);
            if (payload.jivaMode) setJivaMode(payload.jivaMode);
            if (typeof payload.deepMessagesLeft === 'number') {
              setDeepMessagesLeft(payload.deepMessagesLeft);
            }
            if (payload.code !== 'PREMIUM_DAILY_LIMIT_REACHED') {
              setIsPremium(false);
              setInGrace(false);
            }
            // убираем оптимистичные плейсхолдеры
            setMessages((prev) => prev.filter((m) => m.id !== tempUserId && m.id !== tempAsstId));
            return;
          }
          throw new Error(payload.message || 'Payment required');
        }
        if (!res.ok || !res.body) {
          const t = await res.text().catch(() => '');
          throw new Error(t || `HTTP ${res.status}`);
        }

        const headerRemaining = res.headers.get('x-messages-remaining');
        const headerPremium = res.headers.get('x-is-premium');
        const headerInGrace = res.headers.get('x-in-grace');
        const headerGraceDays = res.headers.get('x-grace-days-left');
        const headerHadPremium = res.headers.get('x-had-premium-ever');
        const headerJivaMode = res.headers.get('x-jiva-mode');
        const headerDeepMessagesLeft = res.headers.get('x-deep-messages-left');
        if (headerPremium != null) setIsPremium(headerPremium === 'true');
        if (headerInGrace != null) setInGrace(headerInGrace === 'true');
        if (headerGraceDays != null) {
          const n = Number(headerGraceDays);
          if (!Number.isNaN(n)) setGraceDaysLeft(Math.max(0, n));
        }
        if (headerHadPremium != null) setHadPremiumEver(headerHadPremium === 'true');
        if (headerRemaining != null) {
          const n = Number(headerRemaining);
          if (!Number.isNaN(n) && n >= 0) setMessagesRemaining(n);
        }
        if (headerJivaMode === 'fast' || headerJivaMode === 'deep') {
          setJivaMode(headerJivaMode);
        }
        if (headerDeepMessagesLeft != null) {
          const n = Number(headerDeepMessagesLeft);
          if (!Number.isNaN(n)) setDeepMessagesLeft(Math.max(0, n));
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = '';
        let acc = '';
        let newChatId: string | null = null;

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const lines = buf.split('\n');
          buf = lines.pop() ?? '';
          for (const line of lines) {
            if (!line.startsWith('data: ')) continue;
            const payload = line.slice(6).trim();
            if (payload === '[DONE]') continue;
            try {
              const j = JSON.parse(payload);
              if (j.chatId && !activeChatId) newChatId = j.chatId;
              if (typeof j.isPremium === 'boolean') setIsPremium(j.isPremium);
              if (typeof j.inGrace === 'boolean') setInGrace(j.inGrace);
              if (typeof j.graceDaysLeft === 'number') setGraceDaysLeft(Math.max(0, j.graceDaysLeft));
              if (typeof j.hadPremiumEver === 'boolean') setHadPremiumEver(j.hadPremiumEver);
              if (typeof j.messagesRemaining === 'number' && j.messagesRemaining >= 0) {
                setMessagesRemaining(j.messagesRemaining);
              }
              if (typeof j.dailyLimit === 'number') setDailyLimit(j.dailyLimit);
              if (j.jivaMode === 'fast' || j.jivaMode === 'deep') setJivaMode(j.jivaMode);
              if (typeof j.deepMessagesLeft === 'number') {
                setDeepMessagesLeft(Math.max(0, j.deepMessagesLeft));
              }
              if (j.delta) {
                acc += j.delta;
                setMessages((prev) =>
                  prev.map((m) => (m.id === tempAsstId ? { ...m, content: acc } : m)),
                );
              }
              if (j.farewell && typeof j.farewell.content === 'string') {
                // Джива отправила прощальный апселл вторым сообщением.
                // Добавляем его сразу под основным ответом — фронт под ним
                // отрисует inline-кнопки «Перейти в Premium» / «Остаться на Free».
                const farewellMsg: AiMessage = {
                  id: `farewell-${Date.now()}`,
                  role: 'assistant',
                  content: j.farewell.content,
                  created_at: new Date().toISOString(),
                  metadata: { kind: j.farewell.kind || 'deep_farewell_upsell' },
                };
                setMessages((prev) => [...prev, farewellMsg]);
              }
            } catch {
              // ignore
            }
          }
        }

        if (newChatId) {
          setActiveChatId(newChatId);
          loadChats();
        }
        setMessages((prev) =>
          prev.map((m) => (m.id === tempAsstId ? { ...m, pending: false, content: acc || m.content } : m)),
        );
      } catch (err) {
        console.error('[useAiChat] send', err);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === tempAsstId
              ? { ...m, pending: false, content: 'Не удалось получить ответ. Попробуй ещё раз.' }
              : m,
          ),
        );
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [user, streaming, activeChatId, loadChats],
  );

  const stop = useCallback(() => {
    abortRef.current?.abort();
  }, []);

  const greeting = useMemo(() => buildGreetingMessage(), []);

  return {
    chats,
    activeChatId,
    setActiveChatId,
    messages,
    greeting,
    streaming,
    loadingHistory,
    isPremium,
    messagesRemaining,
    dailyLimit,
    jivaMode,
    deepMessagesLeft,
    freeLimitReached,
    freeLimitReason,
    inGrace,
    graceDaysLeft,
    hadPremiumEver,
    dismissFreeLimit: () => setFreeLimitReached(false),
    newChat,
    send,
    stop,
    refreshChats: loadChats,
  };
}
