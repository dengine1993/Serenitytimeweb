import { 
  FileText, ScrollText, RefreshCcw, AlertTriangle, User,
  Settings, ChevronRight, Crown, Shield, BookText, Palette, Info,
  Users
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";
import { useLegalModal, type LegalDocType } from "@/components/legal/LegalModalProvider";

interface MoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
  legalType?: LegalDocType;
}

interface MenuSection {
  title: string;
  items: MenuItem[];
}

const menuSections: MenuSection[] = [
  {
    title: "О проекте",
    items: [
      { title: "О приложении", href: "/about", icon: Info, description: "О проекте и создателе" },
    ]
  },
  {
    title: "Функции",
    items: [
      { title: "Дневник", href: "/diary", icon: BookText, description: "Записывайте мысли и чувства" },
      { title: "Образ дня", href: "/art-therapy", icon: Palette, description: "Нарисуй, как сейчас — Джива отзовётся" },
      { title: "Сообщество", href: "/community", icon: Users, description: "Люди, которые понимают" },
    ]
  },
  {
    title: "Профиль",
    items: [
      { title: "Настройки", href: "/settings", icon: Settings, description: "Настройки аккаунта" },
    ]
  },
  {
    title: "Документы",
    items: [
      { title: "Политика конфиденциальности", href: "/privacy", icon: FileText, description: "Обработка персональных данных", legalType: "privacy" },
      { title: "Публичная оферта", href: "/offer", icon: ScrollText, description: "Договор оказания услуг", legalType: "offer" },
      { title: "Условия возврата", href: "/refund", icon: RefreshCcw, description: "Правила возврата средств", legalType: "refund" },
      { title: "Условия использования сервиса", href: "/disclaimer", icon: AlertTriangle, description: "Информация о характере услуг и ограничениях ИИ", legalType: "disclaimer" },
      { title: "Информация о продавце", href: "/seller", icon: User, description: "Контактные данные", legalType: "seller" },
    ]
  }
];

export function MoreDrawer({ open, onOpenChange }: MoreDrawerProps) {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { isPremium } = useFeatureAccess();
  const { openLegal } = useLegalModal();

  const handleNavigate = (item: MenuItem) => {
    if (item.legalType) {
      // Закрываем drawer, открываем документ. После закрытия документа — снова открываем drawer.
      onOpenChange(false);
      // Небольшая задержка чтобы Sheet успел корректно отдать фокус и снять focus-trap
      window.setTimeout(() => {
        openLegal(item.legalType!, {
          onAllClosed: () => onOpenChange(true),
        });
      }, 50);
      return;
    }
    navigate(item.href);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="bottom"
        className={cn(
          "h-[85vh] rounded-t-3xl border-t border-border/40 backdrop-blur-2xl bg-background/95"
        )}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <SheetHeader className="pb-4">
          <SheetTitle className="text-2xl font-bold flex items-center gap-2">
            Меню
            {isPremium && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 text-xs font-medium">
                <Crown className="w-3 h-3" />
                Premium
              </span>
            )}
          </SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(85vh-120px)]">
          <div className="space-y-6 pb-6">
            {/* User Profile Section */}
            {user && (
              <div className="flex items-center gap-4 p-4 rounded-2xl bg-accent/30 border border-border/20">
                <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center">
                  <User className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-foreground">{user.email?.split('@')[0]}</p>
                  <p className="text-xs text-muted-foreground">{user.email}</p>
                </div>
                <button
                  onClick={() => {
                    navigate('/admin');
                    onOpenChange(false);
                  }}
                  className="p-2 rounded-xl hover:bg-accent/50 transition-colors"
                  aria-label="Админ"
                >
                  <Shield className="w-5 h-5 text-muted-foreground" />
                </button>
              </div>
            )}

            {/* Menu Sections */}
            {menuSections.map((section, sectionIndex) => (
              <div key={section.title}>
                <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2">
                  {section.title}
                </h3>
                <div className="space-y-1">
                  {section.items.map((item) => {
                    const Icon = item.icon;

                    return (
                      <button
                        key={item.href}
                        onClick={(e) => {
                          (e.currentTarget as HTMLElement).blur();
                          handleNavigate(item);
                        }}
                        className={cn(
                          "w-full flex items-center gap-4 p-4 rounded-2xl transition-colors duration-200",
                          "active:bg-accent/60 active:scale-[0.98]",
                          "focus:outline-none focus-visible:outline-none"
                        )}
                      >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-accent/30">
                          <Icon className="w-5 h-5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 text-left">
                          <p className="font-semibold text-sm text-foreground">
                            {item.title}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {item.description}
                          </p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-muted-foreground" />
                      </button>
                    );
                  })}
                </div>
                {sectionIndex < menuSections.length - 1 && (
                  <Separator className="my-4 opacity-50" />
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
