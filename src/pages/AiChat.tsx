import { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import { ArrowLeft, Plus, Send, Square, Sparkles } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { useAiChat, type AiMessage } from '@/hooks/useAiChat';
import { useAiMemoryStats } from '@/hooks/useAiMemoryStats';
import { usePremiumStatus } from '@/hooks/useEntitlements';
import { useI18n } from '@/hooks/useI18n';
import SEO from '@/components/SEO';
import jivaLogo from '@/assets/jiva.png';
import { AiDisclaimerGate } from '@/components/legal/AiDisclaimerGate';
import { JivaModeInfo } from '@/components/ai/JivaModeInfo';
import { JIVA_CHAT_LIMITS } from '@/config/jivaLimits';
import {
  JivaTrialWelcomeModal,
  shouldShowJivaTrialWelcome,
} from '@/components/ai/JivaTrialWelcomeModal';

export default function AiChat() {
  return (
    <AiDisclaimerGate context="ai-chat">
      <AiChatInner />
    </AiDisclaimerGate>
  );
}

function AiChatInner() {
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
    isPremium: serverIsPremium,
    messagesRemaining,
    dailyLimit,
    jivaMode,
    deepMessagesLeft,
    freeLimitReached,
    freeLimitReason,
    inGrace,
    graceDaysLeft,
  } = useAiChat();
  // Подтягиваем премиум сразу из централизованного хука, чтобы бейдж был виден
  // до отправки первого сообщения. После первого ответа сервер уточнит значение.
  const { isPremium: cachedIsPremium, loading: premiumLoading } = usePremiumStatus();
  const isPremium: boolean | null =
    serverIsPremium !== null ? serverIsPremium : premiumLoading ? null : cachedIsPremium;
  const { count: memoryCount, enabled: memoryEnabled } = useAiMemoryStats();
  const { t, language } = useI18n();
  const [draft, setDraft] = useState('');
  const endRef = useRef<HTMLDivElement>(null);
  const [showSidebar, setShowSidebar] = useState(false);
  const navigate = useNavigate();

  // Welcome-модалка триала: показываем один раз для нового Free-юзера,
  // у которого ещё нет ни одного сообщения. Без упоминания лимитов.
  const [welcomeOpen, setWelcomeOpen] = useState(false);
  const [farewellDismissed, setFarewellDismissed] = useState<Record<string, boolean>>({});

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (
      isPremium === false &&
      !loadingHistory &&
      messages.length === 0 &&
      shouldShowJivaTrialWelcome()
    ) {
      setWelcomeOpen(true);
    }
  }, [isPremium, loadingHistory, messages.length]);

  const handleSend = () => {
    if (!draft.trim() || streaming || freeLimitReached) return;
    const text = draft;
    setDraft('');
    send(text);
  };

  const isEn = language === 'en';

  const showFreeCounter =
    !inGrace && isPremium === false && messagesRemaining !== null && messagesRemaining >= 0;
  const showPremiumCounter =
    isPremium === true && messagesRemaining !== null && messagesRemaining >= 0;

  // Дневные лимиты по умолчанию (если ещё не пришли с сервера).
  // Free Fast: FREE_FAST_DAILY_LIMIT, Free Deep-фаза: FREE_DEEP_TOTAL_LIMIT, Premium: PREMIUM_DAILY_LIMIT.
  const freeLimit = !isPremium
    ? (dailyLimit ?? (jivaMode === 'deep' ? JIVA_CHAT_LIMITS.freeDeepTotalLimit : JIVA_CHAT_LIMITS.freeFastDailyLimit))
    : JIVA_CHAT_LIMITS.freeFastDailyLimit;
  const premiumLimit = isPremium ? (dailyLimit ?? JIVA_CHAT_LIMITS.premiumDailyLimit) : JIVA_CHAT_LIMITS.premiumDailyLimit;

  // Подпись режима Jiva. Пока статус премиума ещё не загружен (null) — бейдж не показываем,
  // чтобы не было флика «Fast → Deep» у премиум-юзера.
  const modeKnown = isPremium !== null;
  const modeBadgeText = !modeKnown
    ? null
    : isPremium
    ? 'Jiva Deep'
    : jivaMode === 'deep'
    ? // Free Deep-фаза: бейдж нейтральный, без счётчика — юзер не должен знать про триал.
      'Jiva'
    : 'Jiva Fast';

  const subtitle = inGrace
    ? isEn
      ? `💛 ${graceDaysLeft} more day${graceDaysLeft === 1 ? '' : 's'} of full access`
      : `💛 Ещё ${graceDaysLeft} ${pluralDays(graceDaysLeft)} полного доступа`
    : showFreeCounter
    ? jivaMode === 'deep'
      ? // Free Deep-фаза: подпись нейтральная и тёплая, без счётчика.
        isEn
        ? "I'm here, listening"
        : 'Я рядом и слушаю тебя'
      : isEn
        ? `${messagesRemaining}/${freeLimit} fast messages today`
        : `${messagesRemaining}/${freeLimit} быстрых сообщений сегодня`
    : showPremiumCounter
    ? isEn
      ? `${messagesRemaining}/${premiumLimit} deep sessions today`
      : `${messagesRemaining}/${premiumLimit} разборов сегодня`
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
    ? 'AI friend who is here for you'
    : 'AI-друг, который рядом';

  // Display greeting when chat is empty
  const displayMessages: AiMessage[] = messages.length === 0 && !loadingHistory ? [greeting] : messages;

  return (
    <div className="min-h-[100dvh] bg-background flex flex-col">
      <SEO
        title={isEn ? 'Jiva — your Friend in New Dawn' : 'Джива — твой Друг внутри «Восхода»'}
        description={isEn ? 'Talk to Jiva — your warm AI friend who is here when it’s anxious, scary or you just want to be heard.' : 'Поговори с Дживой — тёплым ИИ-другом, который рядом, когда тревожно, страшно или просто хочется выговориться.'}
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
            <div className="absolute inset-0 rounded-full bg-gradient-to-br from-orange-400/30 to-rose-500/20 blur-md" />
            <img
              src={jivaLogo}
              alt="Jiva"
              className="relative h-9 w-9 rounded-full object-cover border border-primary/30 shadow-[0_0_12px_hsl(var(--primary)/0.35)]"
            />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <h1 className="text-base font-semibold leading-tight">{isEn ? 'Jiva' : 'Джива'}</h1>
              <JivaModeInfo isPremium={isPremium === true} isEn={isEn} />
              {modeBadgeText && (
                <span
                  className={cn(
                    'text-[9px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded-md border',
                    jivaMode === 'deep' || isPremium
                      ? 'bg-rose-500/15 text-rose-400 dark:text-rose-300 border-rose-400/35'
                      : 'bg-muted text-muted-foreground border-border/50',
                  )}
                  aria-label={modeBadgeText}
                >
                  {modeBadgeText}
                </span>
              )}
            </div>
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
              {displayMessages.map((m) => {
                const isFarewell = m.metadata?.kind === 'deep_farewell_upsell';
                const dismissed = isFarewell && farewellDismissed[m.id];
                return (
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
                        : isFarewell
                          ? 'bg-gradient-to-br from-rose-500/10 via-amber-500/5 to-background text-foreground rounded-bl-sm border border-rose-400/30 shadow-md'
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

                    {isFarewell && !dismissed && (
                      <div className="mt-3 flex flex-col gap-2 pt-2 border-t border-rose-400/20">
                        <Button
                          size="sm"
                          onClick={() => navigate('/premium')}
                          className="w-full bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white gap-1"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                          {isEn ? 'Open Premium' : 'Перейти в Premium'}
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() =>
                            setFarewellDismissed((prev) => ({ ...prev, [m.id]: true }))
                          }
                          className="w-full text-muted-foreground hover:text-foreground"
                        >
                          {isEn ? 'Stay on Free' : 'Остаться на Free'}
                        </Button>
                      </div>
                    )}
                  </div>
                </motion.div>
                );
              })}
              <div ref={endRef} />
            </div>
          </ScrollArea>

          {/* Composer / Paywall */}
          <div className="border-t border-border/40 bg-background/95 backdrop-blur-md p-3">
            {freeLimitReached ? (
              freeLimitReason === 'PREMIUM_DAILY_LIMIT_REACHED' ? (
                <div className="max-w-2xl mx-auto rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                  <p className="text-sm font-medium">
                    {isEn ? 'That’s all for today 💙' : 'На сегодня — всё 💙'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isEn
                      ? `You've used all ${premiumLimit} deep sessions with Jiva today. Come back tomorrow — I'll be here.`
                      : `Сегодня ты использовал все ${premiumLimit} разборов с Jiva Deep. Возвращайся завтра — я буду здесь.`}
                  </p>
                </div>
              ) : freeLimitReason === 'FREE_DAILY_LIMIT_REACHED' ? (
                <div className="max-w-2xl mx-auto rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                  <p className="text-sm font-medium">
                    {isEn ? 'See you tomorrow 💙' : 'Увидимся завтра 💙'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {isEn
                      ? `You've used today's ${freeLimit} conversations with ${jivaMode === 'deep' ? 'Jiva Deep' : 'Jiva Fast'}. Come back tomorrow — or open Jiva Deep without daily limits and with memory.`
                      : `Сегодня ты использовал ${freeLimit} разговоров с ${jivaMode === 'deep' ? 'Jiva Deep' : 'Jiva Fast'}. Возвращайся завтра — или открой Jiva Deep без дневных лимитов и с памятью.`}
                  </p>
                  <Link to="/premium" className="inline-block">
                    <Button size="sm" className="mt-1">
                      {isEn ? 'Open Jiva Deep' : 'Открыть Jiva Deep'}
                    </Button>
                  </Link>
                </div>
              ) : (
                <div className="max-w-2xl mx-auto rounded-2xl border border-primary/30 bg-primary/5 p-4 text-center space-y-2">
                  <p className="text-sm font-medium">
                    {freeLimitReason === 'PREMIUM_EXPIRED'
                      ? isEn ? 'Premium has ended 💙' : 'Premium закончился 💙'
                      : isEn ? "We've only just begun, and your trial messages are over 💙" : 'Мы только начали, а ознакомительные сообщения закончились 💙'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {freeLimitReason === 'PREMIUM_EXPIRED'
                      ? isEn ? 'Renew Premium to bring memory and Jiva Deep back.' : 'Продли Premium, чтобы вернуть память и Jiva Deep.'
                      : isEn ? 'To continue with memory and no daily limits — get Jiva Deep.' : 'Чтобы продолжить с памятью и без дневных лимитов — открой Jiva Deep.'}
                  </p>
                  <Link to="/premium" className="inline-block">
                    <Button size="sm" className="mt-1">
                      {freeLimitReason === 'PREMIUM_EXPIRED'
                        ? isEn ? 'Renew Premium' : 'Продлить Premium'
                        : isEn ? 'Open Jiva Deep' : 'Открыть Jiva Deep'}
                    </Button>
                  </Link>
                </div>
              )
            ) : (
              <>
                <div className="max-w-2xl mx-auto flex items-end gap-2">
                  <Textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={isEn ? 'Write to Jiva — she’ll hear you…' : 'Напиши Дживе — она услышит…'}
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
                <p className="mt-1.5 text-[10px] text-muted-foreground text-center max-w-2xl mx-auto leading-relaxed">
                  {isEn
                    ? 'AI companion · 18+ · Does not replace a doctor or psychologist · In a life-threatening situation — call 112'
                    : 'ИИ-собеседник • 18+ • Не заменяет врача и психолога • При угрозе жизни — звоните 112'}
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

      <JivaTrialWelcomeModal open={welcomeOpen} onOpenChange={setWelcomeOpen} isEn={isEn} />
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
