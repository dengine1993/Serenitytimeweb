import { memo } from "react";
import { Link } from "react-router-dom";
import { User, Shield } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useIsAdmin } from "@/hooks/useIsAdmin";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export const TopHeader = memo(function TopHeader() {
  const { user } = useAuth();
  const { isAdmin } = useIsAdmin();

  return (
    <header className="hidden md:flex sticky top-0 z-40 w-full h-14 border-b border-border/40 backdrop-blur-2xl bg-background/80">
      <div className="container flex items-center justify-between h-full px-6">
        {/* Logo */}
        <Link to="/app" className="flex items-center gap-2 group">
          <span className="text-xl font-bold tracking-[0.18em] bg-gradient-to-r from-orange-400 via-amber-300 to-rose-300 bg-clip-text text-transparent">
            ВОСХОД
          </span>
        </Link>

        {/* Right - Notifications & Avatar */}
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link to="/admin" aria-label="Перейти в админпанель">
              <Badge className="bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 gap-1 cursor-pointer">
                <Shield className="w-3 h-3" />
                ADMIN
              </Badge>
            </Link>
          )}
          <NotificationBell />

          <Link to="/settings" className="group">
            <Avatar className="w-8 h-8 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
              <AvatarFallback className="bg-primary/20 text-primary text-xs font-semibold">
                <User className="w-4 h-4" />
              </AvatarFallback>
            </Avatar>
          </Link>
        </div>
      </div>
    </header>
  );
});
