import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Brain, Activity, Zap, TrendingUp, ShieldQuestion, AlertTriangle, Layers, HeartPulse, Play, Pause, Volume2, VolumeX, Maximize2, Film } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface NavigatorAnxietyProps {
  isLight: boolean;
}

// Types of anxiety disorders
const disordersRu = [
  {
    name: "Генерализованное тревожное расстройство (ГТР)",
    description: "Постоянное беспокойство о повседневных вещах — работе, здоровье, деньгах. Длится более 6 месяцев."
  },
  {
    name: "Паническое расстройство",
    description: "Внезапные панические атаки с физическими симптомами: сердцебиение, удушье, страх смерти."
  },
  {
    name: "Социальная фобия",
    description: "Страх осуждения и критики в социальных ситуациях. Избегание публичных выступлений, вечеринок."
  },
  {
    name: "Специфические фобии",
    description: "Интенсивный страх конкретных объектов или ситуаций: высота, пауки, самолёты, кровь."
  },
  {
    name: "Агорафобия",
    description: "Страх ситуаций, из которых трудно выбраться: толпа, общественный транспорт, открытые пространства."
  }
];

const disordersEn = [
  {
    name: "Generalized Anxiety Disorder (GAD)",
    description: "Constant worry about everyday things — work, health, money. Lasts more than 6 months."
  },
  {
    name: "Panic Disorder",
    description: "Sudden panic attacks with physical symptoms: heart racing, choking, fear of death."
  },
  {
    name: "Social Phobia",
    description: "Fear of judgment and criticism in social situations. Avoiding public speaking, parties."
  },
  {
    name: "Specific Phobias",
    description: "Intense fear of specific objects or situations: heights, spiders, planes, blood."
  },
  {
    name: "Agoraphobia",
    description: "Fear of situations that are hard to escape: crowds, public transport, open spaces."
  }
];

// Panic vs Anxiety comparison
const panicVsAnxietyRu = [
  { aspect: "Начало", panic: "Внезапное, без предупреждения", anxiety: "Постепенное нарастание" },
  { aspect: "Интенсивность", panic: "Очень сильная, пик 10-20 минут", anxiety: "Умеренная, но длительная" },
  { aspect: "Длительность", panic: "Минуты (до 30)", anxiety: "Часы, дни, недели" },
  { aspect: "Симптомы", panic: "Удушье, сердцебиение, страх смерти", anxiety: "Напряжение, беспокойство, усталость" },
  { aspect: "Страх", panic: "«Я умираю прямо сейчас»", anxiety: "«Что-то плохое случится в будущем»" }
];

const panicVsAnxietyEn = [
  { aspect: "Onset", panic: "Sudden, without warning", anxiety: "Gradual buildup" },
  { aspect: "Intensity", panic: "Very strong, peaks in 10-20 min", anxiety: "Moderate but prolonged" },
  { aspect: "Duration", panic: "Minutes (up to 30)", anxiety: "Hours, days, weeks" },
  { aspect: "Symptoms", panic: "Choking, racing heart, fear of death", anxiety: "Tension, worry, fatigue" },
  { aspect: "Fear", panic: "\"I'm dying right now\"", anxiety: "\"Something bad will happen in the future\"" }
];

// Brain function
const brainInfoRu = {
  title: "Как работает мозг при тревоге",
  amygdala: {
    title: "Амигдала — «датчик дыма»",
    description: "Распознаёт угрозы и запускает реакцию «бей или беги». При тревоге работает слишком чувствительно."
  },
  prefrontal: {
    title: "Префронтальная кора — «менеджер»",
    description: "Анализирует ситуацию и решает, реальна ли угроза. При тревоге «менеджер» теряет контроль."
  },
  fightFlight: {
    title: "Реакция «бей или беги»",
    description: "Адреналин, учащённое сердцебиение, быстрое дыхание — это защитный механизм, не опасность."
  }
};

const brainInfoEn = {
  title: "How the brain works during anxiety",
  amygdala: {
    title: "Amygdala — \"smoke detector\"",
    description: "Detects threats and triggers fight-or-flight. In anxiety, it's too sensitive."
  },
  prefrontal: {
    title: "Prefrontal cortex — \"manager\"",
    description: "Analyzes situation and decides if threat is real. In anxiety, \"manager\" loses control."
  },
  fightFlight: {
    title: "Fight-or-flight response",
    description: "Adrenaline, racing heart, fast breathing — it's a protective mechanism, not danger."
  }
};

// Risk factors
const riskFactorsRu = [
  {
    category: "Биологические",
    factors: ["Генетика (тревога в семье)", "Дисбаланс нейромедиаторов", "Гормональные изменения"]
  },
  {
    category: "Психологические",
    factors: ["Перфекционизм", "Низкая самооценка", "Травматический опыт в детстве"]
  },
  {
    category: "Жизненные",
    factors: ["Хронический стресс", "Потери и разрывы", "Финансовые проблемы"]
  },
  {
    category: "Образ жизни",
    factors: ["Кофеин и алкоголь", "Недосыпание", "Отсутствие физической активности"]
  }
];

const riskFactorsEn = [
  {
    category: "Biological",
    factors: ["Genetics (anxiety in family)", "Neurotransmitter imbalance", "Hormonal changes"]
  },
  {
    category: "Psychological",
    factors: ["Perfectionism", "Low self-esteem", "Childhood trauma"]
  },
  {
    category: "Life events",
    factors: ["Chronic stress", "Losses and breakups", "Financial problems"]
  },
  {
    category: "Lifestyle",
    factors: ["Caffeine and alcohol", "Sleep deprivation", "Lack of physical activity"]
  }
];

// Russian data
const symptomsRu = [
  "Постоянное беспокойство без видимой причины",
  "Эмоциональное напряжение, раздражительность, перепады настроения",
  "Учащённое сердцебиение, одышка, потливость",
  "Тремор, сухость во рту, головокружение",
  "Нарушения сна (трудно заснуть или просыпаешься от тревоги)",
  "Мышечные напряжения, усталость, проблемы с концентрацией"
];

const causesRu = [
  "Генетика и биология (нарушение баланса нейромедиаторов)",
  "Стрессовые события (потери, перегрузки)",
  "Хронические заболевания или травмы",
  "Внешние факторы (экономика, новости)"
];

const statisticsRu = [
  "Около 4 млн человек в России имеют психические расстройства, из них значительная часть — тревожные и депрессивные",
  "Тревога затрагивает до 30–40% взрослых в разные периоды жизни",
  "Весной обострения чаще из-за сезонных факторов"
];

const mythsRu = [
  {
    myth: "Тревога — это просто «слабость характера»",
    fact: "Это биологическая реакция, как голод или боль. Многие успешные люди живут с тревогой и справляются."
  },
  {
    myth: "Тревога всегда вредна",
    fact: "В меру она мотивирует (готовит к экзамену). Проблема — когда чрезмерна."
  },
  {
    myth: "Нужно избегать всего, что вызывает тревогу",
    fact: "Избегание усиливает страх. Лучше постепенно сталкиваться с поддержкой."
  },
  {
    myth: "Лекарства — единственный выход",
    fact: "Психотерапия (КПТ) эффективна в 70–80% случаев, часто без медикаментов."
  },
  {
    myth: "Тревога пройдёт сама",
    fact: "Без помощи может хронизироваться, но с техниками и поддержкой — улучшение в 80% случаев."
  }
];

// English data (US statistics from ADAA)
const symptomsEn = [
  "Constant worry without apparent reason",
  "Emotional tension, irritability, mood swings",
  "Rapid heartbeat, shortness of breath, sweating",
  "Tremor, dry mouth, dizziness",
  "Sleep disturbances (difficulty falling asleep or waking from anxiety)",
  "Muscle tension, fatigue, concentration problems"
];

const causesEn = [
  "Genetics and biology (neurotransmitter imbalance)",
  "Stressful events (losses, overloads)",
  "Chronic diseases or trauma",
  "External factors (economy, news)"
];

const statisticsEn = [
  "Around 40 million adults (19.1%) experience anxiety disorders each year",
  "Anxiety disorders are the #1 most common mental illness in the USA",
  "Only 36.9% of those suffering from anxiety receive treatment",
  "Anxiety disorders cost the US more than $42 billion per year"
];

const mythsEn = [
  {
    myth: "Anxiety is just 'character weakness'",
    fact: "It's a biological reaction, like hunger or pain. Many successful people live with anxiety and cope."
  },
  {
    myth: "Anxiety is always harmful",
    fact: "In moderation it motivates (prepares for an exam). The problem is when it's excessive."
  },
  {
    myth: "You need to avoid everything that causes anxiety",
    fact: "Avoidance strengthens fear. It's better to gradually face it with support."
  },
  {
    myth: "Medication is the only way out",
    fact: "Psychotherapy (CBT) is effective in 70-80% of cases, often without medication."
  },
  {
    myth: "Anxiety will go away on its own",
    fact: "Without help it may become chronic, but with techniques and support — improvement in 80% of cases."
  }
];

export default function NavigatorAnxiety({ isLight }: NavigatorAnxietyProps) {
  const { t, language } = useI18n();
  const [activePanicTab, setActivePanicTab] = useState<"panic" | "anxiety">("panic");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [showVideoPlayer, setShowVideoPlayer] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);
  
  const isRussian = language === 'ru';
  const disorders = isRussian ? disordersRu : disordersEn;
  const panicVsAnxiety = isRussian ? panicVsAnxietyRu : panicVsAnxietyEn;
  const brainInfo = isRussian ? brainInfoRu : brainInfoEn;
  const riskFactors = isRussian ? riskFactorsRu : riskFactorsEn;
  const symptoms = isRussian ? symptomsRu : symptomsEn;
  const causes = isRussian ? causesRu : causesEn;
  const statistics = isRussian ? statisticsRu : statisticsEn;
  const myths = isRussian ? mythsRu : mythsEn;
  
  const mythLabel = isRussian ? "Миф" : "Myth";
  const factLabel = isRussian ? "Факт" : "Fact";
  
  const handlePlayPause = () => {
    if (videoRef.current) {
      if (isPlaying) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };
  
  const handleMute = () => {
    if (videoRef.current) {
      videoRef.current.muted = !isMuted;
      setIsMuted(!isMuted);
    }
  };
  
  const handleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.requestFullscreen) {
      video.requestFullscreen();
    } else if ((video as any).webkitEnterFullscreen) {
      (video as any).webkitEnterFullscreen();
    } else if ((video as any).webkitRequestFullscreen) {
      (video as any).webkitRequestFullscreen();
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const time = Number(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60);
    const sec = Math.floor(s % 60);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Intro Card */}
      <div className={cn(
        "p-5 rounded-2xl border",
        isLight 
          ? "bg-white/80 border-slate-200/60 shadow-sm" 
          : "bg-white/5 border-white/10"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isLight ? "bg-violet-100" : "bg-violet-500/20"
          )}>
            <Brain className="w-5 h-5 text-violet-500" />
          </div>
          <div>
            <h2 className={cn(
              "font-semibold mb-1",
              isLight ? "text-slate-800" : "text-white"
            )}>
              {t("navigator.anxiety.intro.title")}
            </h2>
            <p className={cn(
              "text-sm leading-relaxed",
              isLight ? "text-slate-600" : "text-white/70"
            )}>
              {t("navigator.anxiety.intro.description")}
            </p>
          </div>
        </div>
      </div>

      {/* AI Note */}
      <div className={cn(
        "p-4 rounded-xl border-l-4 border-l-amber-400",
        isLight ? "bg-amber-50" : "bg-amber-500/10"
      )}>
        <p className={cn(
          "text-sm italic",
          isLight ? "text-amber-800" : "text-amber-200"
        )}>
          {t("navigator.anxiety.aiNote")}
        </p>
      </div>

      {/* Video Section */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className={cn(
          "rounded-2xl border overflow-hidden",
          isLight 
            ? "bg-gradient-to-br from-violet-50 to-purple-50 border-violet-200/60" 
            : "bg-gradient-to-br from-violet-500/10 to-purple-500/10 border-violet-500/20"
        )}
      >
        {/* Video Header */}
        <div className="p-4 pb-3">
          <div className="flex items-center gap-3 mb-2">
            <div className={cn(
              "w-10 h-10 rounded-xl flex items-center justify-center",
              isLight ? "bg-violet-100" : "bg-violet-500/20"
            )}>
              <Film className="w-5 h-5 text-violet-500" />
            </div>
            <div>
              <h3 className={cn(
                "font-semibold",
                isLight ? "text-slate-800" : "text-white"
              )}>
                {isRussian ? "Видео: Тревожные расстройства" : "Video: Anxiety Disorders"}
              </h3>
              <p className={cn(
                "text-xs",
                isLight ? "text-slate-500" : "text-white/50"
              )}>
                {isRussian ? "Подробный обзор от эксперта" : "Detailed expert overview"}
              </p>
            </div>
          </div>
        </div>

        {/* Video Player */}
        {showVideoPlayer ? (
          <div className="relative">
            <video
              ref={videoRef}
              src="/videos/anxiety-disorders.mp4"
              className="w-full aspect-video bg-black"
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              onEnded={() => setIsPlaying(false)}
              onTimeUpdate={() => setCurrentTime(videoRef.current?.currentTime || 0)}
              onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
              playsInline
              webkit-playsinline=""
            />
            
            {/* Custom Controls Overlay */}
            <div className={cn(
              "absolute bottom-0 left-0 right-0 p-3",
              "bg-gradient-to-t from-black/80 to-transparent"
            )}>
              <div className="space-y-2">
                {/* Seek bar */}
                <div className="flex items-center gap-2">
                  <span className="text-white/70 text-[10px] min-w-[32px] text-right">{formatTime(currentTime)}</span>
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    step={0.1}
                    value={currentTime}
                    onChange={handleSeek}
                    className="flex-1 h-1 accent-white cursor-pointer [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3"
                  />
                  <span className="text-white/70 text-[10px] min-w-[32px]">{formatTime(duration)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handlePlayPause}
                    className="text-white hover:bg-white/20 h-9 w-9"
                  >
                    {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                  </Button>
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleMute}
                    className="text-white hover:bg-white/20 h-9 w-9"
                  >
                    {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
                  </Button>
                  
                  <div className="flex-1" />
                  
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleFullscreen}
                    className="text-white hover:bg-white/20 h-9 w-9"
                  >
                    <Maximize2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Preview/Thumbnail State */
          <div 
            className="relative cursor-pointer group"
            onClick={() => {
              setShowVideoPlayer(true);
              setTimeout(() => {
                if (videoRef.current) {
                  videoRef.current.play();
                }
              }, 100);
            }}
          >
            {/* Video Thumbnail Placeholder */}
            <div className={cn(
              "aspect-video flex items-center justify-center",
              isLight 
                ? "bg-gradient-to-br from-violet-100 to-purple-100" 
                : "bg-gradient-to-br from-violet-900/50 to-purple-900/50"
            )}>
              <div className="text-center">
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  className={cn(
                    "w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-3",
                    "bg-gradient-to-br from-violet-500 to-purple-600",
                    "shadow-lg shadow-violet-500/30",
                    "group-hover:shadow-xl group-hover:shadow-violet-500/40 transition-shadow"
                  )}
                >
                  <Play className="w-8 h-8 text-white ml-1" />
                </motion.div>
                <p className={cn(
                  "font-medium",
                  isLight ? "text-violet-700" : "text-violet-300"
                )}>
                  {isRussian ? "Нажмите для воспроизведения" : "Click to play"}
                </p>
              </div>
            </div>
            
            {/* Glow Effect */}
            <div className="absolute inset-0 pointer-events-none">
              <div className={cn(
                "absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
                "w-32 h-32 rounded-full blur-3xl opacity-30",
                "bg-violet-500"
              )} />
            </div>
          </div>
        )}
        
        {/* Video Description */}
        <div className="p-4 pt-3">
          <p className={cn(
            "text-sm",
            isLight ? "text-slate-600" : "text-white/70"
          )}>
            {isRussian 
              ? "Узнайте больше о тревожных расстройствах, их причинах и методах помощи в этом информативном видео."
              : "Learn more about anxiety disorders, their causes and treatment methods in this informative video."}
          </p>
        </div>
      </motion.div>

      {/* Accordion Sections */}
      <Accordion type="single" collapsible className="space-y-3">
        {/* Types of Disorders - NEW */}
        <AccordionItem 
          value="disorders" 
          className={cn(
            "rounded-2xl border overflow-hidden",
            isLight 
              ? "bg-white/80 border-slate-200/60" 
              : "bg-white/5 border-white/10"
          )}
        >
          <AccordionTrigger className={cn(
            "px-5 py-4 hover:no-underline",
            isLight ? "text-slate-800" : "text-white"
          )}>
            <div className="flex items-center gap-3">
              <Layers className="w-5 h-5 text-indigo-400" />
              <span className="font-medium">
                {isRussian ? "Виды тревожных расстройств" : "Types of Anxiety Disorders"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-3">
              {disorders.map((disorder, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-xl border",
                    isLight ? "bg-slate-50 border-slate-200/60" : "bg-white/5 border-white/10"
                  )}
                >
                  <h4 className={cn(
                    "font-medium text-sm mb-1",
                    isLight ? "text-slate-800" : "text-white"
                  )}>
                    {disorder.name}
                  </h4>
                  <p className={cn(
                    "text-xs",
                    isLight ? "text-slate-600" : "text-white/70"
                  )}>
                    {disorder.description}
                  </p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Panic vs Anxiety - NEW */}
        <AccordionItem 
          value="panic-vs-anxiety" 
          className={cn(
            "rounded-2xl border overflow-hidden",
            isLight 
              ? "bg-white/80 border-slate-200/60" 
              : "bg-white/5 border-white/10"
          )}
        >
          <AccordionTrigger className={cn(
            "px-5 py-4 hover:no-underline",
            isLight ? "text-slate-800" : "text-white"
          )}>
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-400" />
              <span className="font-medium">
                {isRussian ? "Паника vs Тревога" : "Panic vs Anxiety"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            {/* Toggle Tabs */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => setActivePanicTab("panic")}
                className={cn(
                  "flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all",
                  activePanicTab === "panic"
                    ? "bg-red-500/20 text-red-500 border border-red-500/30"
                    : isLight 
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                🔴 {isRussian ? "Паника" : "Panic"}
              </button>
              <button
                onClick={() => setActivePanicTab("anxiety")}
                className={cn(
                  "flex-1 py-2 px-4 rounded-xl text-sm font-medium transition-all",
                  activePanicTab === "anxiety"
                    ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                    : isLight 
                      ? "bg-slate-100 text-slate-600 hover:bg-slate-200" 
                      : "bg-white/5 text-white/60 hover:bg-white/10"
                )}
              >
                🟡 {isRussian ? "Тревога" : "Anxiety"}
              </button>
            </div>
            
            {/* Comparison Cards */}
            <div className="space-y-2">
              {panicVsAnxiety.map((item, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-xl border",
                    isLight ? "bg-slate-50 border-slate-200/60" : "bg-white/5 border-white/10"
                  )}
                >
                  <p className={cn(
                    "text-xs font-medium mb-1",
                    isLight ? "text-slate-500" : "text-white/50"
                  )}>
                    {item.aspect}
                  </p>
                  <p className={cn(
                    "text-sm",
                    activePanicTab === "panic" 
                      ? "text-red-500" 
                      : "text-amber-500"
                  )}>
                    {activePanicTab === "panic" ? item.panic : item.anxiety}
                  </p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* How Brain Works - NEW */}
        <AccordionItem 
          value="brain" 
          className={cn(
            "rounded-2xl border overflow-hidden",
            isLight 
              ? "bg-white/80 border-slate-200/60" 
              : "bg-white/5 border-white/10"
          )}
        >
          <AccordionTrigger className={cn(
            "px-5 py-4 hover:no-underline",
            isLight ? "text-slate-800" : "text-white"
          )}>
            <div className="flex items-center gap-3">
              <HeartPulse className="w-5 h-5 text-pink-400" />
              <span className="font-medium">{brainInfo.title}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-3">
              {[brainInfo.amygdala, brainInfo.prefrontal, brainInfo.fightFlight].map((section, idx) => (
                <div 
                  key={idx}
                  className={cn(
                    "p-3 rounded-xl border",
                    isLight ? "bg-slate-50 border-slate-200/60" : "bg-white/5 border-white/10"
                  )}
                >
                  <h4 className={cn(
                    "font-medium text-sm mb-1",
                    isLight ? "text-slate-800" : "text-white"
                  )}>
                    {section.title}
                  </h4>
                  <p className={cn(
                    "text-xs",
                    isLight ? "text-slate-600" : "text-white/70"
                  )}>
                    {section.description}
                  </p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Risk Factors - NEW */}
        <AccordionItem 
          value="risk-factors" 
          className={cn(
            "rounded-2xl border overflow-hidden",
            isLight 
              ? "bg-white/80 border-slate-200/60" 
              : "bg-white/5 border-white/10"
          )}
        >
          <AccordionTrigger className={cn(
            "px-5 py-4 hover:no-underline",
            isLight ? "text-slate-800" : "text-white"
          )}>
            <div className="flex items-center gap-3">
              <Zap className="w-5 h-5 text-amber-400" />
              <span className="font-medium">
                {isRussian ? "Факторы риска" : "Risk Factors"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-4">
              {riskFactors.map((group, idx) => (
                <div key={idx}>
                  <h4 className={cn(
                    "text-sm font-medium mb-2",
                    isLight ? "text-slate-700" : "text-white/80"
                  )}>
                    {group.category}
                  </h4>
                  <div className="flex flex-wrap gap-2">
                    {group.factors.map((factor, fIdx) => (
                      <span 
                        key={fIdx}
                        className={cn(
                          "px-3 py-1 rounded-full text-xs",
                          isLight 
                            ? "bg-slate-100 text-slate-600" 
                            : "bg-white/10 text-white/70"
                        )}
                      >
                        {factor}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Symptoms */}
        <AccordionItem 
          value="symptoms" 
          className={cn(
            "rounded-2xl border overflow-hidden",
            isLight 
              ? "bg-white/80 border-slate-200/60" 
              : "bg-white/5 border-white/10"
          )}
        >
          <AccordionTrigger className={cn(
            "px-5 py-4 hover:no-underline",
            isLight ? "text-slate-800" : "text-white"
          )}>
            <div className="flex items-center gap-3">
              <Activity className="w-5 h-5 text-rose-400" />
              <span className="font-medium">{t("navigator.anxiety.symptoms.title")}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <ul className="space-y-2">
              {symptoms.map((symptom, idx) => (
                <li 
                  key={idx}
                  className={cn(
                    "flex items-start gap-2 text-sm",
                    isLight ? "text-slate-600" : "text-white/70"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-rose-400 mt-2 shrink-0" />
                  {symptom}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Statistics */}
        <AccordionItem 
          value="statistics" 
          className={cn(
            "rounded-2xl border overflow-hidden",
            isLight 
              ? "bg-white/80 border-slate-200/60" 
              : "bg-white/5 border-white/10"
          )}
        >
          <AccordionTrigger className={cn(
            "px-5 py-4 hover:no-underline",
            isLight ? "text-slate-800" : "text-white"
          )}>
            <div className="flex items-center gap-3">
              <TrendingUp className="w-5 h-5 text-blue-400" />
              <span className="font-medium">{t("navigator.anxiety.statistics.title")}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <ul className="space-y-2">
              {statistics.map((stat, idx) => (
                <li 
                  key={idx}
                  className={cn(
                    "flex items-start gap-2 text-sm",
                    isLight ? "text-slate-600" : "text-white/70"
                  )}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-2 shrink-0" />
                  {stat}
                </li>
              ))}
            </ul>
            <p className={cn(
              "mt-4 text-xs",
              isLight ? "text-slate-500" : "text-white/50"
            )}>
              {t("navigator.anxiety.statistics.source")}
            </p>
          </AccordionContent>
        </AccordionItem>

        {/* Myths */}
        <AccordionItem 
          value="myths" 
          className={cn(
            "rounded-2xl border overflow-hidden",
            isLight 
              ? "bg-white/80 border-slate-200/60" 
              : "bg-white/5 border-white/10"
          )}
        >
          <AccordionTrigger className={cn(
            "px-5 py-4 hover:no-underline",
            isLight ? "text-slate-800" : "text-white"
          )}>
            <div className="flex items-center gap-3">
              <ShieldQuestion className="w-5 h-5 text-purple-400" />
              <span className="font-medium">{t("navigator.anxiety.myths.title")}</span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-4">
              {myths.map((item, idx) => (
                <div key={idx} className="space-y-1">
                  <p className={cn(
                    "text-sm font-medium line-through opacity-60",
                    isLight ? "text-slate-700" : "text-white/70"
                  )}>
                    ❌ {mythLabel}: {item.myth}
                  </p>
                  <p className={cn(
                    "text-sm",
                    isLight ? "text-emerald-700" : "text-emerald-400"
                  )}>
                    ✓ {factLabel}: {item.fact}
                  </p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Bottom Note */}
      <div className={cn(
        "text-center py-4",
        isLight ? "text-slate-500" : "text-white/50"
      )}>
        <p className="text-sm">
          💙 {t("navigator.anxiety.bottomNote")}
        </p>
      </div>
    </motion.div>
  );
}
