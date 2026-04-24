import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Wind, Target, Waves, Brain, Sparkles, 
  Play, CheckCircle, Clock, ChevronRight, X,
  Lightbulb, FileText, MessageCircle, ArrowRight, Star
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/hooks/useI18n";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { BreathingCard } from "@/components/crisis/BreathingCard";
import { GroundingCard } from "@/components/crisis/GroundingCard";
import { SMERWizard } from "@/components/diary/SMERWizard";

interface NavigatorTechniquesProps {
  isLight: boolean;
}

interface SubTechnique {
  id: string;
  name: string;
  icon: typeof Lightbulb;
  iconColor: string;
  description: string;
  hint?: string;
  interactive?: boolean;
  steps?: string[];
}

interface TechniqueDetail {
  title: string;
  description: string;
  steps?: string[];
  subTechniques?: SubTechnique[];
}

const techniques = [
  {
    id: "box-breathing",
    icon: Wind,
    color: "from-sky-500/20 to-blue-500/20",
    borderColor: "border-sky-500/30",
    iconColor: "text-sky-400",
    route: "/breathing-exercise?from=/navigator",
    duration: "2 мин"
  },
  {
    id: "breathing-478",
    icon: Waves,
    color: "from-teal-500/20 to-emerald-500/20",
    borderColor: "border-teal-500/30",
    iconColor: "text-teal-400",
    route: "/breathing-exercise?mode=478&from=/navigator",
    duration: "3 мин"
  },
  {
    id: "grounding-54321",
    icon: Target,
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30",
    iconColor: "text-amber-400",
    route: "/grounding-exercise?from=/navigator",
    duration: "5 мин"
  },
  {
    id: "muscle-relaxation",
    icon: Sparkles,
    color: "from-purple-500/20 to-violet-500/20",
    borderColor: "border-purple-500/30",
    iconColor: "text-purple-400",
    route: null,
    duration: "10 мин"
  },
  {
    id: "cognitive-cbt",
    icon: Brain,
    color: "from-rose-500/20 to-pink-500/20",
    borderColor: "border-rose-500/30",
    iconColor: "text-rose-400",
    route: null,
    duration: "5–15 мин",
    hasSubTechniques: true
  }
];

const techniqueDetails: Record<string, TechniqueDetail> = {
  "box-breathing": {
    title: "Коробочное дыхание (4-4-4-4)",
    description: "Равные фазы дыхания — идеально при панике. Используется спецназом и спортсменами.",
    steps: [
      "Вдохни через нос на 4 счёта",
      "Задержи дыхание на 4 счёта",
      "Выдохни через рот на 4 счёта",
      "Задержи на 4 счёта",
      "Повтори 4–6 раз"
    ]
  },
  "breathing-478": {
    title: "Дыхание 4-7-8 (Эндрю Вейл)",
    description: "Удлинённый выдох активирует парасимпатику. Успокаивает за 4 цикла.",
    steps: [
      "Вдохни через нос на 4 секунды",
      "Задержи дыхание на 7 секунд",
      "Медленно выдохни через рот на 8 секунд",
      "Повтори 4 раза"
    ]
  },
  "grounding-54321": {
    title: "Заземление 5-4-3-2-1",
    description: "Техника возвращает в «здесь и сейчас» через 5 чувств. Разрывает спираль тревоги.",
    steps: [
      "Назови 5 вещей, которые видишь",
      "Назови 4 вещи, которые можешь потрогать",
      "Назови 3 звука, которые слышишь",
      "Назови 2 запаха вокруг",
      "Назови 1 вкус во рту"
    ]
  },
  "muscle-relaxation": {
    title: "Прогрессивная мышечная релаксация",
    description: "Напряжение-расслабление мышц снимает физический стресс. Идеально перед сном.",
    steps: [
      "Начни с ног — напряги на 5 секунд",
      "Резко расслабь на 10 секунд",
      "Поднимайся выше: икры, бёдра, живот",
      "Руки, плечи, лицо",
      "Почувствуй разницу между напряжением и покоем"
    ]
  },
  "cognitive-cbt": {
    title: "Когнитивные техники (КПТ)",
    description: "Научно доказанные методы работы с тревожными мыслями. Помогают увидеть ситуацию объективно и изменить реакцию.",
    subTechniques: [
      {
        id: "smer",
        name: "СМЭР-анализ",
        icon: Star,
        iconColor: "text-amber-400",
        description: "Ситуация → Мысль → Эмоция → Реакция",
        hint: "Главный инструмент для разбора тревожных ситуаций",
        interactive: true
      },
      {
        id: "four-columns",
        name: "Метод 4 колонок",
        icon: FileText,
        iconColor: "text-blue-400",
        description: "Доказательства «за» и «против» тревожной мысли",
        steps: [
          "Запиши автоматическую негативную мысль",
          "Колонка 1: Факты, подтверждающие мысль",
          "Колонка 2: Факты, опровергающие мысль",
          "Колонка 3: Сформулируй сбалансированную альтернативу",
          "Оцени насколько веришь в новую мысль (0-100%)"
        ]
      },
      {
        id: "friend-test",
        name: "Тест «Что бы сказал друг?»",
        icon: MessageCircle,
        iconColor: "text-emerald-400",
        description: "Посмотри на себя глазами заботливого друга",
        steps: [
          "Представь, что близкий друг рассказал тебе эту ситуацию",
          "Что бы ты ему сказал(а)? Запиши дословно",
          "Какие слова поддержки ты бы выбрал(а)?",
          "Примени этот совет к себе — ты заслуживаешь такого же отношения"
        ]
      },
      {
        id: "abc-model",
        name: "ABC-модель Эллиса",
        icon: Lightbulb,
        iconColor: "text-violet-400",
        description: "A (событие) → B (убеждение) → C (последствие)",
        steps: [
          "A — Активирующее событие: что именно произошло? (факты)",
          "B — Beliefs: какие убеждения автоматически сработали?",
          "C — Consequences: какие эмоции и действия последовали?",
          "D — Dispute: оспорь иррациональные убеждения доказательствами",
          "E — Effect: какие новые чувства появляются при альтернативной мысли?"
        ]
      }
    ]
  }
};

export default function NavigatorTechniques({ isLight }: NavigatorTechniquesProps) {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { user } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [activeTechnique, setActiveTechnique] = useState<string | null>(null);
  const [showSMERWizard, setShowSMERWizard] = useState(false);
  const [expandedSubTechniqueId, setExpandedSubTechniqueId] = useState<string | null>(null);

  // Check if technique has inline interactive component
  const hasInlineInteractive = (id: string) => id === "box-breathing" || id === "grounding-54321";

  // Check if technique has sub-techniques (CBT)
  const hasSubTechniques = (id: string) => {
    const details = techniqueDetails[id];
    return details?.subTechniques && details.subTechniques.length > 0;
  };

  const handleTryTechnique = async (technique: typeof techniques[0]) => {
    // Track progress
    if (user) {
      try {
        await supabase.from("user_navigator_progress").upsert({
          user_id: user.id,
          item_type: "technique",
          item_id: technique.id,
          status: "practiced",
          practice_count: 1,
          updated_at: new Date().toISOString()
        }, {
          onConflict: "user_id,item_type,item_id"
        });
      } catch (error) {
        console.error("Failed to track progress:", error);
      }
    }

    if (technique.route) {
      navigate(technique.route);
    } else {
      toast.info("Эта техника пока без интерактивного режима. Следуй шагам выше.");
    }
  };

  const handleSubTechniqueClick = (subTechnique: SubTechnique) => {
    if (subTechnique.id === "smer") {
      setShowSMERWizard(true);
    } else {
      // Expand to show steps
      setExpandedSubTechniqueId(expandedSubTechniqueId === subTechnique.id ? null : subTechnique.id);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Intro */}
      <div className={cn(
        "p-5 rounded-2xl border",
        isLight 
          ? "bg-white/80 border-slate-200/60 shadow-sm" 
          : "bg-white/5 border-white/10"
      )}>
        <div className="flex items-start gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
            isLight ? "bg-amber-100" : "bg-amber-500/20"
          )}>
            <Sparkles className="w-5 h-5 text-amber-500" />
          </div>
          <div>
            <h2 className={cn(
              "font-semibold mb-1",
              isLight ? "text-slate-800" : "text-white"
            )}>
              {t("navigator.techniques.intro.title")}
            </h2>
            <p className={cn(
              "text-sm leading-relaxed",
              isLight ? "text-slate-600" : "text-white/70"
            )}>
              {t("navigator.techniques.intro.description")}
            </p>
          </div>
        </div>
      </div>

      {/* Technique Cards */}
      <div className="space-y-4">
        {techniques.map((tech) => {
          const Icon = tech.icon;
          const details = techniqueDetails[tech.id];
          const isExpanded = expandedId === tech.id;

          return (
            <div
              key={tech.id}
              className={cn(
                "rounded-2xl border overflow-hidden transition-all",
                isLight 
                  ? `bg-gradient-to-br ${tech.color} border-slate-200/60` 
                  : `bg-gradient-to-br ${tech.color} ${tech.borderColor}`
              )}
            >
              {/* Header */}
              <button
                onClick={() => setExpandedId(isExpanded ? null : tech.id)}
                className="w-full p-5 text-left"
              >
                <div className="flex items-start gap-4">
                  <div className={cn(
                    "w-12 h-12 rounded-xl flex items-center justify-center shrink-0",
                    isLight ? "bg-white/60" : "bg-black/20"
                  )}>
                    <Icon className={cn("w-6 h-6", tech.iconColor)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className={cn(
                        "font-semibold",
                        isLight ? "text-slate-800" : "text-white"
                      )}>
                        {details.title}
                      </h3>
                      {tech.route && (
                        <Badge variant="secondary" className="text-xs">
                          <Play className="w-3 h-3 mr-1" />
                          Интерактив
                        </Badge>
                      )}
                      {hasSubTechniques(tech.id) && (
                        <Badge variant="secondary" className="text-xs bg-rose-500/20 text-rose-300">
                          <Brain className="w-3 h-3 mr-1" />
                          4 метода
                        </Badge>
                      )}
                    </div>
                    <p className={cn(
                      "text-sm line-clamp-2",
                      isLight ? "text-slate-600" : "text-white/70"
                    )}>
                      {details.description}
                    </p>
                    <div className="flex items-center gap-3 mt-2">
                      <span className={cn(
                        "text-xs flex items-center gap-1",
                        isLight ? "text-slate-500" : "text-white/50"
                      )}>
                        <Clock className="w-3 h-3" />
                        {tech.duration}
                      </span>
                    </div>
                  </div>
                  <ChevronRight className={cn(
                    "w-5 h-5 transition-transform shrink-0",
                    isExpanded && "rotate-90",
                    isLight ? "text-slate-400" : "text-white/65"
                  )} />
                </div>
              </button>

              {/* Expanded Content */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ 
                      height: "auto", 
                      opacity: 1,
                      transition: {
                        height: { duration: 0.35, ease: [0.33, 1, 0.68, 1] },
                        opacity: { duration: 0.25, delay: 0.1 }
                      }
                    }}
                    exit={{ 
                      height: 0, 
                      opacity: 0,
                      transition: {
                        height: { duration: 0.25, ease: [0.33, 1, 0.68, 1] },
                        opacity: { duration: 0.15 }
                      }
                    }}
                    className={cn(
                      "px-5 pb-5 border-t overflow-hidden",
                      isLight ? "border-slate-200/60" : "border-white/10"
                    )}
                  >
                    <div className="pt-4 space-y-4">
                      {/* CBT with sub-techniques */}
                      {hasSubTechniques(tech.id) && details.subTechniques ? (
                        <div className="space-y-3">
                          {details.subTechniques.map((subTech, subIdx) => {
                            const SubIcon = subTech.icon;
                            const isSubExpanded = expandedSubTechniqueId === subTech.id;
                            
                            return (
                              <motion.div
                                key={subTech.id}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: subIdx * 0.05 }}
                                className={cn(
                                  "rounded-xl border overflow-hidden",
                                  isLight 
                                    ? "bg-white/70 border-slate-200/80" 
                                    : "bg-white/5 border-white/10"
                                )}
                              >
                                <button
                                  onClick={() => handleSubTechniqueClick(subTech)}
                                  className="w-full p-4 text-left"
                                >
                                  <div className="flex items-start gap-3">
                                    <div className={cn(
                                      "w-10 h-10 rounded-lg flex items-center justify-center shrink-0",
                                      subTech.id === "smer" 
                                        ? "bg-gradient-to-br from-amber-400/30 to-orange-400/30" 
                                        : isLight ? "bg-slate-100" : "bg-white/10"
                                    )}>
                                      <SubIcon className={cn("w-5 h-5", subTech.iconColor)} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-2 mb-0.5">
                                        <h4 className={cn(
                                          "font-medium",
                                          isLight ? "text-slate-800" : "text-white"
                                        )}>
                                          {subTech.name}
                                        </h4>
                                        {subTech.interactive && (
                                          <Badge className="text-[10px] px-1.5 py-0 bg-amber-500/20 text-amber-300 border-0">
                                            <Star className="w-2.5 h-2.5 mr-0.5 fill-amber-400" />
                                            Главный
                                          </Badge>
                                        )}
                                      </div>
                                      <p className={cn(
                                        "text-xs",
                                        isLight ? "text-slate-500" : "text-white/60"
                                      )}>
                                        {subTech.description}
                                      </p>
                                      {subTech.hint && (
                                        <p className={cn(
                                          "text-xs mt-1 italic",
                                          isLight ? "text-amber-600" : "text-amber-400/80"
                                        )}>
                                          {subTech.hint}
                                        </p>
                                      )}
                                    </div>
                                    {subTech.interactive ? (
                                      <ArrowRight className={cn(
                                        "w-4 h-4 shrink-0",
                                        isLight ? "text-amber-500" : "text-amber-400"
                                      )} />
                                    ) : (
                                      <ChevronRight className={cn(
                                        "w-4 h-4 transition-transform shrink-0",
                                        isSubExpanded && "rotate-90",
                                        isLight ? "text-slate-400" : "text-white/50"
                                      )} />
                                    )}
                                  </div>
                                </button>

                                {/* Sub-technique expanded steps */}
                                <AnimatePresence>
                                  {isSubExpanded && subTech.steps && (
                                    <motion.div
                                      initial={{ height: 0, opacity: 0 }}
                                      animate={{ 
                                        height: "auto", 
                                        opacity: 1,
                                        transition: {
                                          height: { duration: 0.3, ease: [0.33, 1, 0.68, 1] },
                                          opacity: { duration: 0.2, delay: 0.08 }
                                        }
                                      }}
                                      exit={{ 
                                        height: 0, 
                                        opacity: 0,
                                        transition: {
                                          height: { duration: 0.2, ease: [0.33, 1, 0.68, 1] },
                                          opacity: { duration: 0.1 }
                                        }
                                      }}
                                      className={cn(
                                        "px-4 pb-4 border-t overflow-hidden",
                                        isLight ? "border-slate-200/60" : "border-white/10"
                                      )}
                                    >
                                      <div className="pt-3 space-y-2">
                                        {subTech.steps.map((step, stepIdx) => (
                                          <div 
                                            key={stepIdx}
                                            className={cn(
                                              "flex items-start gap-2.5 text-xs",
                                              isLight ? "text-slate-600" : "text-white/70"
                                            )}
                                          >
                                            <span className={cn(
                                              "w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-medium shrink-0 mt-0.5",
                                              isLight ? "bg-slate-100 text-slate-600" : "bg-white/10 text-white/70"
                                            )}>
                                              {stepIdx + 1}
                                            </span>
                                            <span className="leading-relaxed">{step}</span>
                                          </div>
                                        ))}
                                      </div>
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </motion.div>
                            );
                          })}
                        </div>
                      ) : activeTechnique === tech.id && hasInlineInteractive(tech.id) ? (
                        /* Show inline interactive component */
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className={cn(
                              "text-sm font-medium",
                              isLight ? "text-slate-700" : "text-white/80"
                            )}>
                              Интерактивная практика
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setActiveTechnique(null)}
                              className={cn(
                                "h-8 px-2",
                                isLight ? "text-slate-500 hover:text-slate-700" : "text-white/50 hover:text-white"
                              )}
                            >
                              <X className="w-4 h-4 mr-1" />
                              Свернуть
                            </Button>
                          </div>
                          
                          {tech.id === "box-breathing" && (
                            <BreathingCard isDark={!isLight} />
                          )}
                          {tech.id === "grounding-54321" && (
                            <GroundingCard isDark={!isLight} />
                          )}
                        </div>
                      ) : details.steps ? (
                        /* Standard steps */
                        <>
                          <div className="space-y-2">
                            {details.steps.map((step, stepIdx) => (
                              <div 
                                key={stepIdx}
                                className={cn(
                                  "flex items-start gap-3 text-sm",
                                  isLight ? "text-slate-600" : "text-white/70"
                                )}
                              >
                                <span className={cn(
                                  "w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium shrink-0",
                                  isLight ? "bg-white/60 text-slate-700" : "bg-white/10 text-white/80"
                                )}>
                                  {stepIdx + 1}
                                </span>
                                <span className="pt-0.5">{step}</span>
                              </div>
                            ))}
                          </div>

                          <Button
                            onClick={() => {
                              if (hasInlineInteractive(tech.id)) {
                                setActiveTechnique(tech.id);
                                handleTryTechnique(tech);
                              } else {
                                handleTryTechnique(tech);
                              }
                            }}
                            className={cn(
                              "w-full h-12 rounded-xl font-medium",
                              hasInlineInteractive(tech.id) || tech.route 
                                ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                : isLight 
                                  ? "bg-slate-200 text-slate-700 hover:bg-slate-300" 
                                  : "bg-white/10 text-white hover:bg-white/20"
                            )}
                          >
                            {hasInlineInteractive(tech.id) ? (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Начать практику
                              </>
                            ) : tech.route ? (
                              <>
                                <Play className="w-4 h-4 mr-2" />
                                Попробовать
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-4 h-4 mr-2" />
                                Отметить как освоенную
                              </>
                            )}
                          </Button>
                        </>
                      ) : null}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>

      {/* Tip */}
      <div className={cn(
        "p-4 rounded-xl border-l-4 border-l-emerald-400",
        isLight ? "bg-emerald-50" : "bg-emerald-500/10"
      )}>
        <p className={cn(
          "text-sm",
          isLight ? "text-emerald-800" : "text-emerald-200"
        )}>
          💡 {t("navigator.techniques.tip")}
        </p>
      </div>

      {/* SMER Wizard Modal */}
      <SMERWizard 
        open={showSMERWizard} 
        onOpenChange={setShowSMERWizard} 
        onSuccess={() => {
          toast.success("СМЭР-анализ сохранён в дневник!");
          setShowSMERWizard(false);
        }}
      />
    </motion.div>
  );
}
