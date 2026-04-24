import { useState } from "react";
import { motion } from "framer-motion";
import { 
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { 
  UserRound, AlertTriangle, Stethoscope, Brain, 
  Pill, CheckCircle, Info, ChevronRight
} from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";
import logoBezm from "@/assets/logo-bezm.png";

interface NavigatorProfessionalProps {
  isLight: boolean;
}

// When to seek professional help - warning signs
const warningSignsRu = [
  "Тревога длится более 6 месяцев без улучшений",
  "Тревога мешает работе, учёбе или отношениям",
  "Панические атаки (сильное сердцебиение, ощущение удушья, страх смерти)",
  "Избегание ситуаций, мест или людей из-за страха",
  "Использование алкоголя или препаратов для снижения тревоги",
  "Мысли о самоповреждении или суициде",
  "Физические симптомы без медицинской причины (боли, тошнота)",
  "Бессонница или постоянная усталость"
];

const warningSignsEn = [
  "Anxiety lasting more than 6 months without improvement",
  "Anxiety interfering with work, studies, or relationships",
  "Panic attacks (racing heart, feeling of suffocation, fear of death)",
  "Avoiding situations, places, or people due to fear",
  "Using alcohol or substances to reduce anxiety",
  "Thoughts of self-harm or suicide",
  "Physical symptoms without medical cause (pain, nausea)",
  "Insomnia or constant fatigue"
];

// Specialists comparison
const specialistsRu = [
  {
    title: "Психолог",
    icon: Brain,
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
    description: "Работает с мыслями, эмоциями и поведением",
    when: "Когда нужно разобраться в себе, изменить паттерны мышления",
    canDo: ["Консультирование", "Психотерапия (КПТ, гештальт)", "Тестирование"],
    cannotDo: "Не назначает лекарства, не ставит диагнозы"
  },
  {
    title: "Психотерапевт",
    icon: UserRound,
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
    description: "Врач или психолог с дополнительной подготовкой в терапии",
    when: "Когда нужна длительная терапия с глубокой проработкой",
    canDo: ["КПТ", "Экспозиционная терапия", "EMDR", "Психоанализ"],
    cannotDo: "Зависит от образования: не всегда может назначать лекарства"
  },
  {
    title: "Психиатр",
    icon: Stethoscope,
    color: "text-rose-400",
    bgColor: "bg-rose-500/20",
    description: "Врач с медицинским образованием, специализация — психические расстройства",
    when: "Когда нужны медикаменты или диагноз",
    canDo: ["Диагностика", "Назначение лекарств", "Мониторинг лечения"],
    cannotDo: "Редко проводит психотерапию (только консультации)"
  }
];

const specialistsEn = [
  {
    title: "Psychologist",
    icon: Brain,
    color: "text-violet-400",
    bgColor: "bg-violet-500/20",
    description: "Works with thoughts, emotions and behavior",
    when: "When you need to understand yourself, change thinking patterns",
    canDo: ["Counseling", "Psychotherapy (CBT, Gestalt)", "Assessment"],
    cannotDo: "Cannot prescribe medications or diagnose"
  },
  {
    title: "Psychotherapist",
    icon: UserRound,
    color: "text-teal-400",
    bgColor: "bg-teal-500/20",
    description: "Professional with specialized therapy training",
    when: "When you need long-term therapy with deep work",
    canDo: ["CBT", "Exposure therapy", "EMDR", "Psychoanalysis"],
    cannotDo: "Depends on credentials: may not prescribe medications"
  },
  {
    title: "Psychiatrist",
    icon: Stethoscope,
    color: "text-rose-400",
    bgColor: "bg-rose-500/20",
    description: "Medical doctor specializing in mental disorders",
    when: "When you need medications or diagnosis",
    canDo: ["Diagnosis", "Prescribing medications", "Treatment monitoring"],
    cannotDo: "Rarely conducts psychotherapy (only consultations)"
  }
];

// Treatment methods
const treatmentsRu = [
  {
    id: "diagnosis",
    title: "Диагностика",
    description: "Первый приём у специалиста — это беседа, сбор анамнеза, иногда тесты. Не бойся: цель — понять, как помочь.",
    steps: [
      "Расскажите о симптомах и их длительности",
      "Специалист спросит о жизненной ситуации",
      "Могут быть тесты (GAD-7, PHQ-9)",
      "Вместе составите план лечения"
    ]
  },
  {
    id: "cbt",
    title: "КПТ (Когнитивно-поведенческая терапия)",
    description: "Золотой стандарт лечения тревоги. Эффективна в 70-80% случаев. Работает с мыслями и поведением.",
    steps: [
      "Выявление автоматических мыслей",
      "Проверка их на реалистичность",
      "Замена на более адаптивные",
      "Поведенческие эксперименты",
      "Домашние задания между сессиями"
    ]
  },
  {
    id: "exposure",
    title: "Экспозиционная терапия",
    description: "Постепенное столкновение со страхом в безопасных условиях. Особенно эффективна при фобиях и ОКР.",
    steps: [
      "Составление иерархии страхов",
      "Начало с наименее пугающего",
      "Постепенное усложнение",
      "Обучение тому, что страх проходит сам",
      "Закрепление результатов"
    ]
  },
  {
    id: "weekes",
    title: "Метод Клэр Уикс",
    description: "«Встретить, принять, плыть, позволить времени пройти». Классический метод для панических атак.",
    steps: [
      "Встретить — не убегать от паники",
      "Принять — не бороться с симптомами",
      "Плыть — расслабить мышцы, дышать",
      "Позволить времени пройти — паника всегда заканчивается"
    ]
  }
];

const treatmentsEn = [
  {
    id: "diagnosis",
    title: "Diagnosis",
    description: "First appointment is a conversation, medical history, sometimes tests. Don't worry: the goal is to understand how to help.",
    steps: [
      "Describe your symptoms and their duration",
      "Specialist will ask about life situation",
      "May include tests (GAD-7, PHQ-9)",
      "Together you'll create a treatment plan"
    ]
  },
  {
    id: "cbt",
    title: "CBT (Cognitive Behavioral Therapy)",
    description: "Gold standard for anxiety treatment. Effective in 70-80% of cases. Works with thoughts and behavior.",
    steps: [
      "Identifying automatic thoughts",
      "Testing them for realism",
      "Replacing with more adaptive ones",
      "Behavioral experiments",
      "Homework between sessions"
    ]
  },
  {
    id: "exposure",
    title: "Exposure Therapy",
    description: "Gradually facing fear in safe conditions. Especially effective for phobias and OCD.",
    steps: [
      "Creating fear hierarchy",
      "Starting with least scary",
      "Gradually increasing difficulty",
      "Learning that fear passes on its own",
      "Consolidating results"
    ]
  },
  {
    id: "weekes",
    title: "Claire Weekes Method",
    description: "\"Face, accept, float, let time pass\". Classic method for panic attacks.",
    steps: [
      "Face — don't run from panic",
      "Accept — don't fight symptoms",
      "Float — relax muscles, breathe",
      "Let time pass — panic always ends"
    ]
  }
];

// Medications info
const medicationsRu = [
  {
    id: "ssri",
    title: "СИОЗС (антидепрессанты)",
    description: "Селективные ингибиторы обратного захвата серотонина. Первая линия лечения тревожных расстройств.",
    examples: "Сертралин, Эсциталопрам, Пароксетин",
    notes: "Эффект через 2-4 недели. Не вызывают зависимости.",
    color: "text-blue-400"
  },
  {
    id: "benzo",
    title: "Бензодиазепины (транквилизаторы)",
    description: "Быстрое снятие тревоги, но высокий риск зависимости. Только кратковременно.",
    examples: "Феназепам, Диазепам, Алпразолам",
    notes: "⚠️ Только по назначению, коротким курсом. Риск зависимости.",
    color: "text-amber-400"
  },
  {
    id: "buspirone",
    title: "Буспирон (анксиолитик)",
    description: "Небензодиазепиновый препарат для длительного лечения ГТР. Не вызывает зависимости.",
    examples: "Буспирон, Спитомин",
    notes: "Эффект через 1-2 недели. Хорошо переносится.",
    color: "text-emerald-400"
  }
];

const medicationsEn = [
  {
    id: "ssri",
    title: "SSRIs (antidepressants)",
    description: "Selective serotonin reuptake inhibitors. First-line treatment for anxiety disorders.",
    examples: "Sertraline, Escitalopram, Paroxetine",
    notes: "Effect in 2-4 weeks. Non-addictive.",
    color: "text-blue-400"
  },
  {
    id: "benzo",
    title: "Benzodiazepines (tranquilizers)",
    description: "Fast anxiety relief, but high addiction risk. Short-term only.",
    examples: "Xanax, Valium, Ativan",
    notes: "⚠️ Prescription only, short courses. Addiction risk.",
    color: "text-amber-400"
  },
  {
    id: "buspirone",
    title: "Buspirone (anxiolytic)",
    description: "Non-benzodiazepine for long-term GAD treatment. Non-addictive.",
    examples: "Buspirone, BuSpar",
    notes: "Effect in 1-2 weeks. Well tolerated.",
    color: "text-emerald-400"
  }
];

export default function NavigatorProfessional({ isLight }: NavigatorProfessionalProps) {
  const { t, language } = useI18n();
  const [expandedSpecialist, setExpandedSpecialist] = useState<number | null>(null);
  
  const isRussian = language === 'ru';
  const warningSigns = isRussian ? warningSignsRu : warningSignsEn;
  const specialists = isRussian ? specialistsRu : specialistsEn;
  const treatments = isRussian ? treatmentsRu : treatmentsEn;
  const medications = isRussian ? medicationsRu : medicationsEn;

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
            isLight ? "bg-rose-100" : "bg-rose-500/20"
          )}>
            <UserRound className="w-5 h-5 text-rose-500" />
          </div>
          <div>
            <h2 className={cn(
              "font-semibold mb-1",
              isLight ? "text-slate-800" : "text-white"
            )}>
              {isRussian ? "Профессиональная помощь" : "Professional Help"}
            </h2>
            <p className={cn(
              "text-sm leading-relaxed",
              isLight ? "text-slate-600" : "text-white/70"
            )}>
              {isRussian 
                ? "Когда самопомощь недостаточна, специалисты могут помочь. Здесь — всё, что нужно знать о профессиональной поддержке."
                : "When self-help isn't enough, professionals can help. Here's everything you need to know about professional support."
              }
            </p>
          </div>
        </div>
      </div>

      <Accordion type="single" collapsible className="space-y-3">
        {/* When to seek help */}
        <AccordionItem 
          value="when" 
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
              <AlertTriangle className="w-5 h-5 text-amber-400" />
              <span className="font-medium">
                {isRussian ? "Когда пора к специалисту" : "When to see a specialist"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <p className={cn(
              "text-sm mb-4",
              isLight ? "text-slate-600" : "text-white/70"
            )}>
              {isRussian 
                ? "Если хотя бы 2-3 пункта про тебя — стоит обратиться за помощью:"
                : "If 2-3 of these apply to you — consider seeking help:"
              }
            </p>
            <ul className="space-y-2">
              {warningSigns.map((sign, idx) => (
                <li 
                  key={idx}
                  className={cn(
                    "flex items-start gap-2 text-sm",
                    isLight ? "text-slate-600" : "text-white/70"
                  )}
                >
                  <CheckCircle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
                  {sign}
                </li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        {/* Who is who */}
        <AccordionItem 
          value="specialists" 
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
              <Stethoscope className="w-5 h-5 text-teal-400" />
              <span className="font-medium">
                {isRussian ? "Психолог, психотерапевт, психиатр — кто есть кто" : "Psychologist, therapist, psychiatrist — who is who"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-4">
              {specialists.map((spec, idx) => {
                const Icon = spec.icon;
                const isExpanded = expandedSpecialist === idx;
                
                return (
                  <motion.div
                    key={idx}
                    className={cn(
                      "p-4 rounded-xl border cursor-pointer transition-all",
                      isLight 
                        ? "bg-slate-50 border-slate-200/60 hover:border-slate-300" 
                        : "bg-white/5 border-white/10 hover:border-white/20"
                    )}
                    onClick={() => setExpandedSpecialist(isExpanded ? null : idx)}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                        spec.bgColor
                      )}>
                        <Icon className={cn("w-5 h-5", spec.color)} />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between">
                          <h4 className={cn(
                            "font-medium",
                            isLight ? "text-slate-800" : "text-white"
                          )}>
                            {spec.title}
                          </h4>
                          <ChevronRight className={cn(
                            "w-4 h-4 transition-transform",
                            isExpanded && "rotate-90",
                            isLight ? "text-slate-400" : "text-white/65"
                          )} />
                        </div>
                        <p className={cn(
                          "text-sm mt-1",
                          isLight ? "text-slate-500" : "text-white/60"
                        )}>
                          {spec.description}
                        </p>
                        
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            className="mt-3 pt-3 border-t border-dashed space-y-2"
                            style={{ borderColor: isLight ? "#e2e8f0" : "rgba(255,255,255,0.1)" }}
                          >
                            <p className={cn("text-xs", isLight ? "text-slate-500" : "text-white/50")}>
                              <strong>{isRussian ? "Когда:" : "When:"}</strong> {spec.when}
                            </p>
                            <p className={cn("text-xs", isLight ? "text-slate-500" : "text-white/50")}>
                              <strong>{isRussian ? "Может:" : "Can:"}</strong> {spec.canDo.join(", ")}
                            </p>
                            <p className={cn("text-xs", isLight ? "text-slate-500" : "text-white/50")}>
                              <strong>{isRussian ? "Не может:" : "Cannot:"}</strong> {spec.cannotDo}
                            </p>
                          </motion.div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Treatment methods */}
        <AccordionItem 
          value="treatments" 
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
              <Brain className="w-5 h-5 text-violet-400" />
              <span className="font-medium">
                {isRussian ? "Как лечат тревогу" : "How anxiety is treated"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            <div className="space-y-4">
              {treatments.map((treatment) => (
                <div 
                  key={treatment.id}
                  className={cn(
                    "p-4 rounded-xl border",
                    isLight 
                      ? "bg-slate-50 border-slate-200/60" 
                      : "bg-white/5 border-white/10"
                  )}
                >
                  <h4 className={cn(
                    "font-medium mb-2",
                    isLight ? "text-slate-800" : "text-white"
                  )}>
                    {treatment.title}
                  </h4>
                  <p className={cn(
                    "text-sm mb-3",
                    isLight ? "text-slate-600" : "text-white/70"
                  )}>
                    {treatment.description}
                  </p>
                  <div className="space-y-1.5">
                    {treatment.steps.map((step, stepIdx) => (
                      <div 
                        key={stepIdx}
                        className={cn(
                          "flex items-start gap-2 text-xs",
                          isLight ? "text-slate-500" : "text-white/60"
                        )}
                      >
                        <span className={cn(
                          "w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-xs font-medium",
                          isLight ? "bg-violet-100 text-violet-600" : "bg-violet-500/20 text-violet-400"
                        )}>
                          {stepIdx + 1}
                        </span>
                        <span className="pt-0.5">{step}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        {/* Medications */}
        <AccordionItem 
          value="medications" 
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
              <Pill className="w-5 h-5 text-blue-400" />
              <span className="font-medium">
                {isRussian ? "Медикаменты (информативно)" : "Medications (informational)"}
              </span>
            </div>
          </AccordionTrigger>
          <AccordionContent className="px-5 pb-5">
            {/* Disclaimer */}
            <div className={cn(
              "p-3 rounded-lg mb-4 flex items-start gap-2",
              isLight ? "bg-amber-50" : "bg-amber-500/10"
            )}>
              <Info className="w-4 h-4 text-amber-500 mt-0.5 shrink-0" />
              <p className={cn(
                "text-xs",
                isLight ? "text-amber-800" : "text-amber-200"
              )}>
                {isRussian 
                  ? "⚠️ Только врач может назначить лекарства. Информация ниже — для общего понимания."
                  : "⚠️ Only a doctor can prescribe medications. Information below is for general understanding."
                }
              </p>
            </div>
            
            <div className="space-y-4">
              {medications.map((med) => (
                <div 
                  key={med.id}
                  className={cn(
                    "p-4 rounded-xl border",
                    isLight 
                      ? "bg-slate-50 border-slate-200/60" 
                      : "bg-white/5 border-white/10"
                  )}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Pill className={cn("w-4 h-4", med.color)} />
                    <h4 className={cn(
                      "font-medium",
                      isLight ? "text-slate-800" : "text-white"
                    )}>
                      {med.title}
                    </h4>
                  </div>
                  <p className={cn(
                    "text-sm mb-2",
                    isLight ? "text-slate-600" : "text-white/70"
                  )}>
                    {med.description}
                  </p>
                  <p className={cn(
                    "text-xs mb-1",
                    isLight ? "text-slate-500" : "text-white/50"
                  )}>
                    <strong>{isRussian ? "Примеры:" : "Examples:"}</strong> {med.examples}
                  </p>
                  <p className={cn(
                    "text-xs",
                    isLight ? "text-slate-500" : "text-white/50"
                  )}>
                    {med.notes}
                  </p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* Bezm Comment */}
      <div className={cn(
        "p-4 rounded-xl border-l-4 border-l-amber-400",
        isLight ? "bg-amber-50" : "bg-amber-500/10"
      )}>
        <div className="flex items-start gap-3">
          <img 
            src={logoBezm} 
            alt="Безмятежные" 
            className="w-8 h-8 object-contain rounded-lg"
          />
          <p className={cn(
            "text-sm italic",
            isLight ? "text-amber-800" : "text-amber-200"
          )}>
            {isRussian 
              ? "Обратиться за помощью — это сила, не слабость. Ты делаешь правильный шаг, изучая это. Мы рядом 💙"
              : "Seeking help is strength, not weakness. You're taking the right step by learning this. We're with you 💙"
            }
          </p>
        </div>
      </div>

      {/* Bottom Note */}
      <div className={cn(
        "text-center py-4",
        isLight ? "text-slate-500" : "text-white/50"
      )}>
        <p className="text-sm">
          💙 {isRussian ? "Ты заслуживаешь поддержки. Мы рядом." : "You deserve support. We're with you."}
        </p>
      </div>
    </motion.div>
  );
}
