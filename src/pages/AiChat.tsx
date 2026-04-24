import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Plus, Send, Square } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAiChat, type AiMessage } from '@/hooks/useAiChat';
import { useAiMemoryStats } from '@/hooks/useAiMemoryStats';
import { useI18n } from '@/hooks/useI18n';
import SEO from '@/components/SEO';
import jivaLogo from '@/assets/jiva.png';

export default function AiChat() {
  const {
    chats,
    activeChatId,
    setActiveChatId,
    messages,
    greeting,
    streaming,
    send,
    stop,
    newChat,
    loadingHistory,
    isPremium,
    messagesRemaining,
    freeLimitReached,
    freeLimitReason,
    inGrace,
    graceDaysLeft,
  } = useAiChat();
  const { count: memoryCount, enabled: memoryEnabled } = useAiMemoryStats();
  const { t, language } = useI18n();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const [showSidebar, setShowSidebar] = useState(false);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    if (!draft.trim() || streaming || freeLimitReached) return;
    const text = draft;
    setDraft('');
    send(text);
  };

  const showFreeCounter =
    !inGrace && isPremium === false && messagesRemaining !== null && messagesRemaining >= 0;

  const isEn = language === 'en';

  const subtitle = inGrace
    ? isEn
      ? `💛 ${graceDaysLeft} more day${graceDaysLeft === 1 ? '' : 's'} of full access`
      : `💛 Ещё ${graceDaysLeft} ${pluralDays(graceDaysLeft)} полного доступа`
    : showFreeCounter
    ? isEn
      ? `${messagesRemaining} of 3 trial messages left`
      : `Осталось ${messagesRemaining} из 3 ознакомительных сообщений`
    : isPremium && memoryEnabled
    ? memoryCount > 0
      ? isEn
        ? `🧠 I remember ${memoryCount} thing${memoryCount === 1 ? '' : 's'} about you`
        : `🧠 Помню ${memoryCount} ${pluralFacts(memoryCount)} о тебе`
      : isEn
      ? 'Remembers you. Holds you gently.'
      : 'Помнит тебя. Поддерживает мягко.'
    : isPremium
    ? isEn
      ? 'Memory is off in settings'
      : 'Память отключена в настройках'
    : isEn
    ? 'AI psychologist · Claude Sonnet 4.6'
    : 'AI-психолог · Claude Sonnet 4.6';

  // Display greeting when chat is empty
  const displayMessages: AiMessage[] = messages.length === 0 && !loadingHistory ? [greeting] : messages;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <SEO
        title={isEn ? 'Jiva — your empathetic AI psychologist' : 'Jiva — твой эмпатичный AI-психолог'}
        description={isEn ? 'A conversation with Jiva, our empathetic AI psychologist who remembers your story.' : 'Разговор с Дживой — нашим эмпатичным AI-психологом, который помнит твою историю.'}
      />

      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-border/40">
        <div className="flex items-center gap-2 px-4 py-3 max-w-3xl mx-auto">
          <Link to="/app" aria-label={isEn ? 'Back' : 'Назад'}>
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-5 w-5" />
            </Button>
          </Link>
          <div className="relative h-9 w-9 shrink-0">
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/30 to-violet-500/20 blur-md" />
            <img
              src={jivaLogo}
              alt="Jiva"
              className="relative h-9 w-9 rounded-full object-cover border border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
            />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold leading-tight">Jiva</h1>
            <p className="text-[11px] text-muted-foreground truncate">{subtitle}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowSidebar((v) => !v)}
            className="text-xs"
          >
            {isEn ? 'History' : 'История'}
          </Button>
          <Button variant="ghost" size="icon" onClick={newChat} aria-label={isEn ? 'New chat' : 'Новый чат'}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <div className="flex flex-1 max-w-3xl mx-auto w-full">
        {/* Sidebar */}
        {showSidebar && (
          <aside className="w-56 shrink-0 border-r border-border/30 p-2 hidden md:block">
            <ChatList chats={chats} activeId={activeChatId} onSelect={setActiveChatId} isEn={isEn} />
          </aside>
        )}

        {/* Main */}
        <div className="flex-1 flex flex-col min-h-0">
          <ScrollArea className="flex-1 px-4 py-4">
            <div className="space-y-4 max-w-2xl mx-auto pb-4">
              {displayMessages.map((m) => (
                <motion.div
                  key={m.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={cn('flex items-start gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}
                >
                  {m.role === 'assistant' && (
                    <img
                      src={jivaLogo}
                      alt=""
                      aria-hidden="true"
                      className="h-7 w-7 rounded-full object-cover border border-primary/20 shrink-0 mt-0.5"
                    />
                  )}
                  <div
                    className={cn(
                      'max-w-[85%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground rounded-br-sm'
                        : 'bg-muted/60 text-foreground rounded-bl-sm border border-border/40',
                    )}
                  >
                    {m.role === 'assistant' ? (
                      <div className="prose prose-sm dark:prose-invert max-w-none [&>*]:my-1 whitespace-pre-wrap">
                        <ReactMarkdown>{m.content || (m.pending ? '…' : '')}</ReactMarkdown>
                      </div>
                    ) : (
                      <p className="whitespace-pre-wrap break-words">{m.content}</p>
                    )}
                  </div>
                </motion.div>
              ))}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          {/* Composer / Paywall */}
          <div className="border-t border-border/40 bg-background/95 backdrop-blur-md p-3">
            {freeLimitReached ? (
              <div className="max-w-2xl mx-auto rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                <p className="text-sm font-medium">
                  {freeLimitReason === 'PREMIUM_EXPIRED'
                    ? isEn ? 'Premium has ended 💙' : 'Premium закончился 💙'
                    : isEn ? "We've only just begun, and your trial messages are over 💙" : 'Мы только начали, а ознакомительные сообщения закончились 💙'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {freeLimitReason === 'PREMIUM_EXPIRED'
                    ? isEn ? 'Free messages were already used earlier. Renew Premium to bring memory and unlimited chat back.' : 'Free-сообщения уже потратились раньше. Продли Premium, чтобы вернуть память и безлимит.'
                    : isEn ? 'To continue with memory and no limits — get Premium.' : 'Чтобы продолжить с памятью и без ограничений — оформи Premium.'}
                </p>
                <Link to="/premium" className="inline-block">
                  <Button size="sm" className="mt-1">
                    {freeLimitReason === 'PREMIUM_EXPIRED'
                      ? isEn ? 'Renew Premium' : 'Продлить Premium'
                      : isEn ? 'Open Premium' : 'Открыть Premium'}
                  </Button>
                </Link>
              </div>
            ) : (
              <>
                <div className="max-w-2xl mx-auto flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={isEn ? 'Tell Jiva what you feel right now…' : 'Расскажи Дживе, что у тебя сейчас на душе…'}
                    rows={1}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSend();
                      }
                    }}
                    className="resize-none max-h-40 text-sm"
                    disabled={streaming}
                  />
                  {streaming ? (
                    <Button onClick={stop} variant="secondary" size="icon" aria-label={isEn ? 'Stop' : 'Остановить'}>
                      <Square className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSend}
                      size="icon"
                      disabled={!draft.trim()}
                      aria-label={isEn ? 'Send' : 'Отправить'}
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <p className="mt-1.5 text-[10px] text-muted-foreground text-center max-w-2xl mx-auto">
                  {isEn
                    ? 'Jiva is not a doctor and does not give diagnoses. In a crisis — open SOS or call a hotline.'
                    : 'Jiva — не врач и не ставит диагнозы. В кризисе — раздел SOS или 8-800-2000-122.'}
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Mobile sidebar */}
      {showSidebar && (
        <div
          className="fixed inset-0 z-30 bg-background/80 backdrop-blur md:hidden"
          onClick={() => setShowSidebar(false)}
        >
          <div
            className="absolute right-0 top-0 bottom-0 w-72 bg-background border-l border-border/40 p-3 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-sm font-semibold mb-2">{isEn ? 'Your conversations' : 'Твои разговоры'}</h2>
            <ChatList
              chats={chats}
              activeId={activeChatId}
              isEn={isEn}
              onSelect={(id) => {
                setActiveChatId(id);
                setShowSidebar(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

function ChatList({
  chats,
  activeId,
  onSelect,
  isEn,
}: {
  chats: { id: string; title: string | null; updated_at: string }[];
  activeId: string | null;
  onSelect: (id: string) => void;
  isEn: boolean;
}) {
  if (chats.length === 0) {
    return <p className="text-xs text-muted-foreground p-2">{isEn ? 'No conversations yet.' : 'Пока нет разговоров.'}</p>;
  }
  return (
    <ul className="space-y-1">
      {chats.map((c) => (
        <li key={c.id}>
          <button
            onClick={() => onSelect(c.id)}
            className={cn(
              'w-full text-left px-2 py-1.5 rounded-lg text-xs transition-colors',
              activeId === c.id
                ? 'bg-primary/15 text-primary'
                : 'hover:bg-accent/50 text-foreground/80',
            )}
          >
            <span className="block truncate">{c.title || (isEn ? 'New conversation' : 'Новый разговор')}</span>
            <span className="block text-[10px] text-muted-foreground">
              {new Date(c.updated_at).toLocaleDateString(isEn ? 'en-US' : 'ru-RU')}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}

function pluralFacts(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'факт';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'факта';
  return 'фактов';
}

function pluralDays(n: number): string {
  const m10 = n % 10;
  const m100 = n % 100;
  if (m10 === 1 && m100 !== 11) return 'день';
  if (m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20)) return 'дня';
  return 'дней';
}
