import { motion } from "framer-motion";
import { 
  BookOpen, Phone, ExternalLink, 
  Book, Globe
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

interface NavigatorResourcesProps {
  isLight: boolean;
}

// Russian books
const booksRu = [
  {
    title: "«Терапия беспокойства» — Дэвид Бернс",
    description: "Практические упражнения КПТ от создателя метода",
    tag: "КПТ"
  },
  {
    title: "«Свобода от тревоги» — Роберт Лихи",
    description: "Как работать с тревожными мыслями",
    tag: "Когнитивная терапия"
  },
  {
    title: "«Тревожный мозг» — Джозеф Леду",
    description: "Научное объяснение механизмов тревоги",
    tag: "Нейронаука"
  },
  {
    title: "«Возвращение к жизни» — Пол Дэвид",
    description: "Личный опыт преодоления панических атак",
    tag: "Личный опыт"
  },
  {
    title: "«Будь спок» — Джилл Уэбер",
    description: "Техники управления тревогой на каждый день",
    tag: "Практика"
  },
  {
    title: "«Тревога не то, чем кажется» — Елена Садова",
    description: "Российский взгляд на работу с тревогой",
    tag: "Россия"
  }
];

// English books
const booksEn = [
  {
    title: "\"The Feeling Good Handbook\" — David Burns",
    description: "Practical CBT exercises from the method's creator",
    tag: "CBT"
  },
  {
    title: "\"The Anxiety and Phobia Workbook\" — Edmund Bourne",
    description: "Step-by-step techniques and exercises",
    tag: "Workbook"
  },
  {
    title: "\"Anxious\" — Joseph LeDoux",
    description: "Scientific explanation of anxiety mechanisms",
    tag: "Neuroscience"
  },
  {
    title: "\"Dare\" — Barry McDonagh",
    description: "Personal experience overcoming panic attacks",
    tag: "Personal story"
  },
  {
    title: "\"The Worry Cure\" — Robert Leahy",
    description: "Seven steps to stop worry from stopping you",
    tag: "Cognitive therapy"
  }
];

// Russian hotlines
const hotlinesRu = [
  {
    name: "Телефон доверия",
    number: "8-800-2000-122",
    note: "Круглосуточно, анонимно, бесплатно",
    primary: true
  },
  {
    name: "Телефон доверия МЧС",
    number: "8 (495) 989-50-50",
    note: "Психологическая помощь МЧС"
  },
  {
    name: "Экстренная психологическая помощь",
    number: "051",
    note: "Бесплатно с мобильного"
  },
  {
    name: "Линия помощи в стрессовых ситуациях",
    number: "8-800-250-18-59",
    note: "Бесплатно по России"
  }
];

// US hotlines
const hotlinesEn = [
  {
    name: "988 Suicide & Crisis Lifeline",
    number: "988",
    note: "Call or text 24/7, free and confidential",
    primary: true
  },
  {
    name: "Crisis Text Line",
    number: "Text HOME to 741741",
    note: "Free 24/7 text support"
  },
  {
    name: "SAMHSA National Helpline",
    number: "1-800-662-4357",
    note: "Free 24/7, 365-day-a-year treatment referral"
  },
  {
    name: "NAMI Helpline",
    number: "1-800-950-6264",
    note: "Mental health information and referrals"
  }
];

// Russian online resources
const onlineResourcesRu = [
  {
    title: "Минздрав РФ — Психическое здоровье",
    url: "https://minzdrav.gov.ru"
  },
  {
    title: "WHO — Психическое здоровье",
    url: "https://www.who.int/health-topics/mental-health"
  },
  {
    title: "psy.ru — Статьи психологов",
    url: "https://psy.ru"
  }
];

// English online resources
const onlineResourcesEn = [
  {
    title: "ADAA — Anxiety and Depression Association",
    url: "https://adaa.org"
  },
  {
    title: "WHO — Mental Health",
    url: "https://www.who.int/health-topics/mental-health"
  },
  {
    title: "NIMH — National Institute of Mental Health",
    url: "https://www.nimh.nih.gov"
  }
];

export default function NavigatorResources({ isLight }: NavigatorResourcesProps) {
  const { t, language } = useI18n();
  
  const isRussian = language === 'ru';
  const books = isRussian ? booksRu : booksEn;
  const hotlines = isRussian ? hotlinesRu : hotlinesEn;
  const onlineResources = isRussian ? onlineResourcesRu : onlineResourcesEn;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="space-y-6"
    >
      {/* Hotlines Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-red-400" />
          <h2 className={cn(
            "font-semibold",
            isLight ? "text-slate-800" : "text-white"
          )}>
            {t("navigator.resources.hotlines.title")}
          </h2>
        </div>

        <div className="space-y-3">
          {hotlines.map((hotline, idx) => (
            <a
              key={idx}
              href={hotline.number.includes("Text") ? undefined : `tel:${hotline.number.replace(/[^0-9+]/g, '')}`}
              className={cn(
                "block p-4 rounded-2xl border transition-all",
                hotline.primary 
                  ? isLight 
                    ? "bg-red-50 border-red-200 hover:border-red-300" 
                    : "bg-red-500/10 border-red-500/30 hover:border-red-500/50"
                  : isLight 
                    ? "bg-white/80 border-slate-200/60 hover:border-slate-300" 
                    : "bg-white/5 border-white/10 hover:border-white/20"
              )}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className={cn(
                    "font-medium",
                    hotline.primary 
                      ? isLight ? "text-red-800" : "text-red-400"
                      : isLight ? "text-slate-800" : "text-white"
                  )}>
                    {hotline.name}
                  </h3>
                  <p className={cn(
                    "text-lg font-semibold mt-1",
                    hotline.primary 
                      ? isLight ? "text-red-700" : "text-red-300"
                      : isLight ? "text-slate-700" : "text-white/90"
                  )}>
                    {hotline.number}
                  </p>
                  <p className={cn(
                    "text-xs mt-1",
                    isLight ? "text-slate-500" : "text-white/50"
                  )}>
                    {hotline.note}
                  </p>
                </div>
                <Phone className={cn(
                  "w-6 h-6 shrink-0",
                  hotline.primary 
                    ? isLight ? "text-red-400" : "text-red-400"
                    : isLight ? "text-slate-400" : "text-white/65"
                )} />
              </div>
            </a>
          ))}
        </div>

        <p className={cn(
          "text-xs text-center",
          isLight ? "text-slate-500" : "text-white/50"
        )}>
          {t("navigator.resources.hotlines.note")}
        </p>
      </div>

      {/* Books Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Book className="w-5 h-5 text-emerald-400" />
          <h2 className={cn(
            "font-semibold",
            isLight ? "text-slate-800" : "text-white"
          )}>
            {t("navigator.resources.books.title")}
          </h2>
        </div>

        <div className="space-y-3">
          {books.map((book, idx) => (
            <div
              key={idx}
              className={cn(
                "p-4 rounded-2xl border",
                isLight 
                  ? "bg-white/80 border-slate-200/60" 
                  : "bg-white/5 border-white/10"
              )}
            >
              <div className="flex items-start gap-3">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                  isLight ? "bg-emerald-100" : "bg-emerald-500/20"
                )}>
                  <BookOpen className="w-5 h-5 text-emerald-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className={cn(
                    "font-medium text-sm",
                    isLight ? "text-slate-800" : "text-white"
                  )}>
                    {book.title}
                  </h3>
                  <p className={cn(
                    "text-xs mt-1",
                    isLight ? "text-slate-500" : "text-white/60"
                  )}>
                    {book.description}
                  </p>
                  <Badge 
                    variant="secondary" 
                    className={cn(
                      "mt-2 text-xs",
                      isLight ? "bg-slate-100" : "bg-white/10"
                    )}
                  >
                    {book.tag}
                  </Badge>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Online Resources */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <Globe className="w-5 h-5 text-blue-400" />
          <h2 className={cn(
            "font-semibold",
            isLight ? "text-slate-800" : "text-white"
          )}>
            {t("navigator.resources.online.title")}
          </h2>
        </div>

        <div className="space-y-3">
          {onlineResources.map((resource, idx) => (
            <a
              key={idx}
              href={resource.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center gap-3 p-4 rounded-2xl border transition-all group",
                isLight 
                  ? "bg-white/80 border-slate-200/60 hover:border-blue-300" 
                  : "bg-white/5 border-white/10 hover:border-blue-500/30"
              )}
            >
              <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                isLight ? "bg-blue-100" : "bg-blue-500/20"
              )}>
                <Globe className="w-5 h-5 text-blue-500" />
              </div>
              <span className={cn(
                "flex-1 font-medium text-sm group-hover:text-primary transition-colors",
                isLight ? "text-slate-700" : "text-white/90"
              )}>
                {resource.title}
              </span>
              <ExternalLink className={cn(
                "w-4 h-4 shrink-0",
                isLight ? "text-slate-400" : "text-white/65"
              )} />
            </a>
          ))}
        </div>
      </div>

      {/* Bottom Note */}
      <div className={cn(
        "p-4 rounded-xl border-l-4 border-l-amber-400",
        isLight ? "bg-amber-50" : "bg-amber-500/10"
      )}>
        <p className={cn(
          "text-sm",
          isLight ? "text-amber-800" : "text-amber-200"
        )}>
          💙 {t("navigator.resources.bottomNote")}
        </p>
      </div>
    </motion.div>
  );
}
