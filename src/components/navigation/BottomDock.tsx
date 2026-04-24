import { memo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Home, Users, Menu } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { MoreDrawer } from "./MoreDrawer";
import jivaLogo from "@/assets/jiva.png";

type TabItem = {
  title: string;
  href: string;
  icon?: React.ComponentType<{ className?: string }>;
  image?: string;
  ariaLabel: string;
  glow?: string;
  urgent?: boolean;
};

const tabs: TabItem[] = [
  { title: "Главная", href: "/app", icon: Home, ariaLabel: "Главная страница" },
  { title: "Jiva", href: "/ai-chat", image: jivaLogo, ariaLabel: "Jiva — AI-психолог", glow: "rgba(168, 85, 247, 0.5)" },
  { title: "SOS", href: "/crisis", ariaLabel: "Кризисная поддержка", glow: "rgba(239, 68, 68, 0.5)", urgent: true },
  { title: "Чат", href: "/community", icon: Users, ariaLabel: "Чат" },
  { title: "Ещё", href: "#more", icon: Menu, ariaLabel: "Больше разделов" },
];

export const BottomDock = memo(function BottomDock() {
  const location = useLocation();
  const [moreDrawerOpen, setMoreDrawerOpen] = useState(false);

  const handleTabClick = (href: string, e: React.MouseEvent) => {
    if (href === "#more") {
      e.preventDefault();
      setMoreDrawerOpen(true);
    }
  };

  return (
    <>
      <nav 
        className="fixed bottom-0 left-0 right-0 z-50"
        aria-label="Главная навигация"
      >
        {/* Background layer to cover safe-area gap */}
        <div className="absolute bottom-0 left-0 right-0 h-[env(safe-area-inset-bottom,0px)] bg-background" />
        
        <div className="relative mx-3 mb-safe flex justify-around items-center px-3 py-3.5 rounded-3xl backdrop-blur-2xl bg-background/80 border border-border/40 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
          {/* Ambient glow */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-primary/5 via-transparent to-transparent pointer-events-none" />
          
          {tabs.map((tab) => {
            const isActive = location.pathname === tab.href;
            const isMoreButton = tab.href === "#more";
            
            return (
              <Link
                key={tab.href}
                to={tab.href}
                onClick={(e) => handleTabClick(tab.href, e)}
                className={cn(
                  "relative flex flex-col items-center justify-center gap-1 min-w-[48px] min-h-[48px] px-3 py-2 rounded-2xl transition-all duration-300",
                  isActive 
                    ? "text-primary" 
                    : "text-muted-foreground hover:text-foreground",
                  isMoreButton && "hover:bg-accent/50"
                )}
                aria-label={tab.ariaLabel}
                aria-current={isActive ? "page" : undefined}
              >
                {/* Active indicator with glow */}
                {isActive && (
                  <>
                    <motion.div
                      layoutId="activeTabDock"
                      className="absolute inset-0 rounded-2xl bg-primary/15 border border-primary/30"
                      transition={{ type: "spring", stiffness: 380, damping: 30 }}
                    />
                    <motion.div
                      className="absolute inset-0 rounded-2xl blur-xl opacity-50"
                      style={{ 
                        background: `radial-gradient(circle at center, ${tab.glow || 'hsl(var(--primary) / 0.4)'}, transparent 60%)`
                      }}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 0.5 }}
                      transition={{ duration: 0.3 }}
                    />
                  </>
                )}
                
                {tab.image ? (
                  <img 
                    src={tab.image} 
                    alt={tab.title}
                    className={cn(
                      "h-6 w-6 relative z-10 transition-transform duration-300 object-contain rounded-full",
                      isActive && "scale-110"
                    )}
                  />
                ) : tab.urgent ? (
                  <span
                    className={cn(
                      "relative z-10 inline-flex items-center justify-center px-2 h-9 min-w-[40px] rounded-lg text-[12px] font-extrabold tracking-widest text-white bg-red-600 shadow-[0_0_14px_rgba(239,68,68,0.65)] transition-transform duration-300",
                      isActive && "scale-110"
                    )}
                    aria-hidden="true"
                  >
                    SOS
                  </span>
                ) : tab.icon ? (
                  <tab.icon className={cn(
                    "h-5 w-5 relative z-10 transition-transform duration-300",
                    isActive && "scale-110"
                  )} />
                ) : null}
                {!tab.urgent && (
                  <span className={cn(
                    "text-[11px] font-medium relative z-10",
                    isActive && "font-semibold"
                  )}>
                    {tab.title}
                  </span>
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      <MoreDrawer open={moreDrawerOpen} onOpenChange={setMoreDrawerOpen} />
    </>
  );
});
