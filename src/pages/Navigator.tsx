import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Compass, ArrowLeft, Search, Brain, Sparkles, 
  BookOpen, BarChart3, AlertTriangle, ChevronRight,
  Phone, UserRound
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import SEO from "@/components/SEO";
import { useI18n } from "@/hooks/useI18n";
import { useHomeTheme } from "@/hooks/useHomeTheme";
import { cn } from "@/lib/utils";

// Sub-pages
import NavigatorAnxiety from "@/components/navigator/NavigatorAnxiety";
import NavigatorTechniques from "@/components/navigator/NavigatorTechniques";
import NavigatorResources from "@/components/navigator/NavigatorResources";
import NavigatorProfessional from "@/components/navigator/NavigatorProfessional";
import { NavigatorBreadcrumbs } from "@/components/navigator/NavigatorBreadcrumbs";

type NavigatorSection = "landing" | "anxiety" | "techniques" | "professional" | "resources";

const categories = [
  {
    id: "anxiety" as const,
    icon: Brain,
    color: "from-violet-500/20 to-purple-500/20",
    borderColor: "border-violet-500/30",
    iconColor: "text-violet-400"
  },
  {
    id: "techniques" as const,
    icon: Sparkles,
    color: "from-amber-500/20 to-orange-500/20",
    borderColor: "border-amber-500/30",
    iconColor: "text-amber-400"
  },
  {
    id: "professional" as const,
    icon: UserRound,
    color: "from-rose-500/20 to-pink-500/20",
    borderColor: "border-rose-500/30",
    iconColor: "text-rose-400"
  },
  {
    id: "resources" as const,
    icon: BookOpen,
    color: "from-emerald-500/20 to-teal-500/20",
    borderColor: "border-emerald-500/30",
    iconColor: "text-emerald-400"
  },
];

export default function Navigator() {
  const navigate = useNavigate();
  const { t } = useI18n();
  const { theme } = useHomeTheme();
  const [activeSection, setActiveSection] = useState<NavigatorSection>("landing");
  const [searchQuery, setSearchQuery] = useState("");

  const isLight = theme === "light";

  const handleBack = () => {
    if (activeSection === "landing") {
      navigate("/app");
    } else {
      setActiveSection("landing");
    }
  };

  const getSectionTitle = () => {
    switch (activeSection) {
      case "anxiety": return t("navigator.sections.anxiety.title");
      case "techniques": return t("navigator.sections.techniques.title");
      case "professional": return t("navigator.sections.professional.title");
      case "resources": return t("navigator.sections.resources.title");
      default: return t("navigator.title");
    }
  };
  

  // Filter categories by search query
  const filteredCategories = categories.filter(cat => {
    if (!searchQuery.trim()) return true;
    const title = t(`navigator.sections.${cat.id}.title`).toLowerCase();
    const subtitle = t(`navigator.sections.${cat.id}.subtitle`).toLowerCase();
    return title.includes(searchQuery.toLowerCase()) || subtitle.includes(searchQuery.toLowerCase());
  });

  return (
    <>
      <SEO 
        title={t("navigator.seo.title")}
        description={t("navigator.seo.description")}
      />

      <div className={cn(
        "min-h-screen relative overflow-hidden transition-colors duration-500",
        isLight 
          ? "bg-gradient-to-b from-sky-50 via-blue-50 to-orange-50" 
          : "bg-[#080A10]"
      )}>
        {/* Ambient background */}
        <div className="pointer-events-none absolute inset-0">
          {isLight ? (
            <>
              <div className="absolute inset-x-0 -top-48 h-96 bg-[radial-gradient(circle_at_top,rgba(147,197,253,0.3),transparent_60%)] blur-3xl" />
              <div className="absolute inset-x-0 bottom-0 h-80 bg-[radial-gradient(circle_at_bottom,rgba(254,215,170,0.3),transparent_65%)] blur-3xl" />
            </>
          ) : (
            <>
              <div className="absolute inset-x-0 -top-48 h-96 bg-[radial-gradient(circle_at_top,rgba(120,146,255,0.18),transparent_60%)] blur-3xl" />
              <div className="absolute inset-x-0 bottom-0 h-80 bg-[radial-gradient(circle_at_bottom,rgba(255,226,189,0.16),transparent_65%)] blur-3xl" />
            </>
          )}
        </div>

        <div className="relative z-10 container max-w-4xl mx-auto px-4 py-6 pb-24">
          {/* Header */}
          <motion.header 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6"
          >
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleBack}
                aria-label={t("common.back")}
                className={cn(
                  "rounded-full",
                  isLight ? "hover:bg-slate-200/50" : "hover:bg-white/10"
                )}
              >
                <ArrowLeft className={cn("w-5 h-5", isLight ? "text-slate-700" : "text-white")} />
              </Button>
              
              <div className="flex items-center gap-2">
                <div className={cn(
                  "w-10 h-10 rounded-xl flex items-center justify-center",
                  isLight ? "bg-primary/10" : "bg-primary/20"
                )}>
                  <Compass className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <h1 className={cn(
                    "text-xl font-bold",
                    isLight ? "text-slate-800" : "text-white"
                  )}>
                    {getSectionTitle()}
                  </h1>
                  {activeSection !== "landing" && (
                    <p className={cn(
                      "text-xs",
                      isLight ? "text-slate-500" : "text-white/50"
                    )}>
                      {t("navigator.title")}
                    </p>
                  )}
                </div>
              </div>
            </div>
          </motion.header>

          <AnimatePresence mode="wait">
            {activeSection === "landing" ? (
              <motion.div
                key="landing"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                {/* Welcome Greeting */}
                <div
                  className={cn(
                    "p-5 rounded-2xl border",
                    isLight 
                      ? "bg-white/80 border-slate-200/60 shadow-sm" 
                      : "bg-white/5 border-white/10"
                  )}
                >
                  <div className="flex items-start gap-4">
                    <div className="relative shrink-0">
                      <div className={cn(
                        "w-12 h-12 rounded-xl flex items-center justify-center",
                        isLight ? "bg-primary/10" : "bg-primary/20"
                      )}>
                        <Compass className="w-6 h-6 text-primary" />
                      </div>
                    </div>
                    <div className="flex-1">
                      <p className={cn(
                        "text-sm leading-relaxed",
                        isLight ? "text-slate-700" : "text-white/85"
                      )}>
                        {t("navigator.greeting")}
                      </p>
                      <p className={cn(
                        "text-xs mt-2",
                        isLight ? "text-slate-500" : "text-white/50"
                      )}>
                        {t("navigator.disclaimer")}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Search */}
                <div className="relative">
                  <Search className={cn(
                    "absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4",
                    isLight ? "text-slate-400" : "text-white/65"
                  )} />
                  <Input
                    type="text"
                    placeholder={t("navigator.searchPlaceholder")}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className={cn(
                      "pl-11 h-12 rounded-xl border",
                      isLight 
                        ? "bg-white/80 border-slate-200/60 text-slate-800 placeholder:text-slate-400" 
                        : "bg-white/5 border-white/10 text-white placeholder:text-white/65"
                    )}
                  />
                </div>

                {/* Categories Grid */}
                <div className="grid grid-cols-2 gap-4">
                  {filteredCategories.map((cat, idx) => {
                    const Icon = cat.icon;
                    return (
                      <motion.button
                        key={cat.id}
                        onClick={() => setActiveSection(cat.id)}
                        aria-label={t(`navigator.sections.${cat.id}.title`)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className={cn(
                          "p-5 rounded-2xl border text-left transition-all group",
                          isLight 
                            ? `bg-gradient-to-br ${cat.color} border-slate-200/60 hover:shadow-md` 
                            : `bg-gradient-to-br ${cat.color} ${cat.borderColor} hover:bg-white/5`
                        )}
                      >
                        <div className="flex flex-col items-start gap-4">
                          <div className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 mb-3",
                            isLight ? "bg-white/60" : "bg-black/20"
                          )}>
                            <Icon className={cn("w-5 h-5", cat.iconColor)} />
                          </div>
                          <div className="flex-1">
                            <h3 className={cn(
                              "font-semibold mb-1",
                              isLight ? "text-slate-800" : "text-white"
                            )}>
                              {t(`navigator.sections.${cat.id}.title`)}
                            </h3>
                            <p className={cn(
                              "text-xs line-clamp-2",
                              isLight ? "text-slate-600" : "text-white/60"
                            )}>
                              {t(`navigator.sections.${cat.id}.subtitle`)}
                            </p>
                          </div>
                          <ChevronRight className={cn(
                            "w-4 h-4 transition-transform group-hover:translate-x-1 shrink-0 mt-2",
                            isLight ? "text-slate-400" : "text-white/65"
                          )} />
                        </div>
                      </motion.button>
                    );
                  })}
                </div>

                {/* Empty state for search */}
                {filteredCategories.length === 0 && searchQuery.trim() && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className={cn(
                      "p-6 rounded-2xl border text-center",
                      isLight 
                        ? "bg-white/80 border-slate-200/60" 
                        : "bg-white/5 border-white/10"
                    )}
                  >
                    <Search className={cn(
                      "w-10 h-10 mx-auto mb-3",
                      isLight ? "text-slate-300" : "text-white/30"
                    )} />
                    <p className={cn(
                      "font-medium mb-1",
                      isLight ? "text-slate-700" : "text-white"
                    )}>
                      {t("navigator.noResults")}
                    </p>
                    <p className={cn(
                      "text-sm",
                      isLight ? "text-slate-500" : "text-white/60"
                    )}>
                      {t("navigator.tryAnotherSearch")}
                    </p>
                  </motion.div>
                )}

                {/* Hotlines Quick Access */}
                <div
                  className={cn(
                    "p-4 rounded-2xl border flex items-center gap-4",
                    isLight 
                      ? "bg-red-50/80 border-red-200/60" 
                      : "bg-red-500/10 border-red-500/20"
                  )}
                >
                  <div className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    isLight ? "bg-red-100" : "bg-red-500/20"
                  )}>
                    <Phone className="w-5 h-5 text-red-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className={cn(
                      "font-medium text-sm",
                      isLight ? "text-red-800" : "text-red-400"
                    )}>
                      {t("navigator.hotlines.title")}
                    </h4>
                    <p className={cn(
                      "text-xs truncate",
                      isLight ? "text-red-600/70" : "text-red-400/60"
                    )}>
                      {t("navigator.hotlines.subtitle")}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setActiveSection("resources")}
                    className={cn(
                      "shrink-0",
                      isLight ? "text-red-700 hover:bg-red-100" : "text-red-400 hover:bg-red-500/20"
                    )}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
                

                {/* Crisis Button - inline instead of fixed */}
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.4, delay: 0.2 }}
                  className="mt-6 mb-8"
                >
                  <Button
                    onClick={() => navigate("/crisis")}
                    className={cn(
                      "w-full h-14 rounded-2xl font-medium shadow-lg",
                      "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600",
                      "text-white border-0"
                    )}
                  >
                    <AlertTriangle className="w-5 h-5 mr-2" />
                    {t("navigator.crisisButton")}
                  </Button>
                </motion.div>
              </motion.div>
            ) : activeSection === "anxiety" ? (
              <NavigatorAnxiety key="anxiety" isLight={isLight} />
            ) : activeSection === "techniques" ? (
              <NavigatorTechniques key="techniques" isLight={isLight} />
            ) : activeSection === "professional" ? (
              <NavigatorProfessional key="professional" isLight={isLight} />
            ) : activeSection === "resources" ? (
              <NavigatorResources key="resources" isLight={isLight} />
            ) : null}
          </AnimatePresence>
        </div>

      </div>
    </>
  );
}
