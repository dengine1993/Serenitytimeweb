import { useState } from "react";
import { NavLink } from "react-router-dom";
import { 
  LayoutDashboard, 
  Users, 
  Shield, 
  CreditCard, 
  Brain, 
  ArrowLeft,
  Menu,
  Database,
  ScrollText,
  DollarSign,
  Sparkles
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/use-mobile";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const navItems = [
  { to: "/admin", icon: LayoutDashboard, label: "Дашборд", end: true },
  { to: "/admin/users", icon: Users, label: "Пользователи" },
  { to: "/admin/moderation", icon: Shield, label: "Модерация" },
  { to: "/admin/database", icon: Database, label: "База данных" },
  { to: "/admin/logs", icon: ScrollText, label: "Логи" },
  { to: "/admin/payments", icon: CreditCard, label: "Платежи" },
  { to: "/admin/pricing", icon: DollarSign, label: "Цены" },
  { to: "/admin/ai", icon: Brain, label: "AI & Usage" },
  { to: "/admin/ai-memory", icon: Sparkles, label: "Память ИИ" },
];

export function AdminSidebar() {
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const sidebarContent = (
    <>
      {/* Header */}
      <div className="p-6 border-b border-border/50">
        <h1 className="text-xl font-bold bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Безмятежные
        </h1>
        <p className="text-xs text-muted-foreground mt-1">
          Панель администратора
        </p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            onClick={() => isMobile && setIsOpen(false)}
            className={({ isActive }) =>
              cn(
                "flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200",
                isActive
                  ? "bg-primary/10 text-primary border border-primary/20"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              )
            }
          >
            <item.icon className="h-5 w-5" />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border/50">
        <NavLink
          to="/app"
          onClick={() => isMobile && setIsOpen(false)}
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-all duration-200"
        >
          <ArrowLeft className="h-5 w-5" />
          <span>В приложение</span>
        </NavLink>
      </div>
    </>
  );

  if (isMobile) {
    return (
      <>
        <Button 
          variant="outline" 
          size="icon" 
          className="fixed top-4 left-4 z-50 lg:hidden bg-background/80 backdrop-blur-sm"
          onClick={() => setIsOpen(true)}
        >
          <Menu className="h-5 w-5" />
        </Button>
        
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="left" className="w-64 p-0 bg-background/95 backdrop-blur-xl">
            <div className="h-full flex flex-col">
              {sidebarContent}
            </div>
          </SheetContent>
        </Sheet>
      </>
    );
  }

  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-background/80 backdrop-blur-xl border-r border-border/50 z-50 flex flex-col">
      {sidebarContent}
    </aside>
  );
}
