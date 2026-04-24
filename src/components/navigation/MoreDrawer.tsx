import { 
  FileText, ScrollText, RefreshCcw, AlertTriangle, User,
  Settings, ChevronRight, Crown, Shield, BookText, Palette, Compass, Info,
  Users, Heart
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/useAuth";
import { useFeatureAccess } from "@/hooks/useFeatureAccess";

interface MoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface MenuItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  description: string;
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
      { title: "Арт-терапия", href: "/art-therapy", icon: Palette, description: "Рисуйте и анализируйте эмоции" },
      { title: "Навигатор", href: "/navigator", icon: Compass, description: "Пошаговая помощь при тревоге" },
      { title: "Сообщество", href: "/community", icon: Users, description: "Люди, которые понимают" },
      { title: "Срочная помощь", href: "/crisis", icon: Heart, description: "Дыхание и заземление" },
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
      { title: "Политика конфиденциальности", href: "/privacy", icon: FileText, description: "Обработка персональных данных" },
      { title: "Публичная оферта", href: "/offer", icon: ScrollText, description: "Договор оказания услуг" },
      { title: "Условия возврата", href: "/refund", icon: RefreshCcw, description: "Правила возврата средств" },
      { title: "Отказ от ответственности", href: "/disclaimer", icon: AlertTriangle, description: "Важные предупреждения" },
      { title: "Информация о продавце", href: "/seller", icon: User, description: "Контактные данные" },
    ]
  }
];

// Calculate global index for stagger animation
const getGlobalIndex = (sectionIndex: number, itemIndex: number): number => {
  let globalIndex = 0;
  for (let i = 0; i < sectionIndex; i++) {
    globalIndex += menuSections[i].items.length;
  }
  return globalIndex + itemIndex;
};

export function MoreDrawer({ open, onOpenChange }: MoreDrawerProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { isPremium } = useFeatureAccess();

  const handleNavigate = (item: MenuItem) => {
    navigate(item.href);
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-t border-border/40 backdrop-blur-2xl bg-background/95">
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
          <AnimatePresence>
            {open && (
              <motion.div 
                className="space-y-6 pb-6"
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                {/* User Profile Section */}
                {user && (
                  <motion.div 
                    className="flex items-center gap-4 p-4 rounded-2xl bg-accent/30 border border-border/20"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, ease: "easeOut" }}
                  >
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
                    >
                      <Shield className="w-5 h-5 text-muted-foreground" />
                    </button>
                  </motion.div>
                )}

                {/* Menu Sections */}
                {menuSections.map((section, sectionIndex) => (
                  <motion.div 
                    key={section.title}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 + sectionIndex * 0.05, duration: 0.3 }}
                  >
                    <motion.h3 
                      className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3 px-2"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.15 + sectionIndex * 0.05, duration: 0.3 }}
                    >
                      {section.title}
                    </motion.h3>
                    <div className="space-y-1">
                      {section.items.map((item, itemIndex) => {
                        const Icon = item.icon;
                        const isActive = location.pathname === item.href;
                        const globalIndex = getGlobalIndex(sectionIndex, itemIndex);
                        
                        return (
                          <motion.button
                            key={item.href}
                            onClick={() => handleNavigate(item)}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ 
                              delay: 0.1 + globalIndex * 0.03, 
                              duration: 0.3,
                              ease: "easeOut"
                            }}
                            whileHover={{ scale: 1.01, x: 4 }}
                            whileTap={{ scale: 0.98 }}
                            className={cn(
                              "w-full flex items-center gap-4 p-4 rounded-2xl transition-all duration-300",
                              isActive 
                                ? "bg-primary/15 border border-primary/30" 
                                : "hover:bg-accent/50"
                            )}
                          >
                            <div className={cn(
                              "w-10 h-10 rounded-xl flex items-center justify-center transition-colors",
                              isActive ? "bg-primary/20" : "bg-accent/30"
                            )}>
                              <Icon className={cn(
                                "w-5 h-5",
                                isActive ? "text-primary" : "text-muted-foreground"
                              )} />
                            </div>
                            <div className="flex-1 text-left">
                              <p className={cn(
                                "font-semibold text-sm",
                                isActive ? "text-primary" : "text-foreground"
                              )}>
                                {item.title}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {item.description}
                              </p>
                            </div>
                            <ChevronRight className={cn(
                              "w-4 h-4",
                              isActive ? "text-primary" : "text-muted-foreground"
                            )} />
                          </motion.button>
                        );
                      })}
                    </div>
                    {sectionIndex < menuSections.length - 1 && (
                      <Separator className="my-4 opacity-50" />
                    )}
                  </motion.div>
                ))}

              </motion.div>
            )}
          </AnimatePresence>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}