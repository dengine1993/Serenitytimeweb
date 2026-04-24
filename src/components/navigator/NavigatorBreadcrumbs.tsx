import { ChevronRight, Home } from "lucide-react";
import { useI18n } from "@/hooks/useI18n";
import { cn } from "@/lib/utils";

type NavigatorSection = "landing" | "anxiety" | "techniques" | "professional" | "resources" | "progress";

interface NavigatorBreadcrumbsProps {
  activeSection: NavigatorSection;
  onNavigate: (section: NavigatorSection) => void;
  isLight: boolean;
}

export function NavigatorBreadcrumbs({ activeSection, onNavigate, isLight }: NavigatorBreadcrumbsProps) {
  const { t } = useI18n();

  if (activeSection === "landing") return null;

  return (
    <nav 
      aria-label={t("navigator.breadcrumbs.label")}
      className={cn(
        "flex items-center gap-2 text-sm mb-4 px-1",
        isLight ? "text-slate-500" : "text-white/60"
      )}
    >
      <button
        onClick={() => onNavigate("landing")}
        className={cn(
          "flex items-center gap-1 hover:underline transition-colors",
          isLight ? "hover:text-slate-700" : "hover:text-white"
        )}
        aria-label={t("navigator.breadcrumbs.home")}
      >
        <Home className="w-3.5 h-3.5" />
        <span>{t("navigator.title")}</span>
      </button>
      <ChevronRight className="w-3.5 h-3.5" />
      <span className={cn(
        "font-medium",
        isLight ? "text-slate-800" : "text-white"
      )}>
        {t(`navigator.sections.${activeSection}.title`)}
      </span>
    </nav>
  );
}
