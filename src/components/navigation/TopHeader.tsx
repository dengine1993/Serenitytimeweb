import { memo } from "react";
import { Link } from "react-router-dom";
import { User } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";

export const TopHeader = memo(function TopHeader() {
  const { user } = useAuth();

  return (
    <header className="hidden md:flex sticky top-0 z-40 w-full h-14 border-b border-border/40 backdrop-blur-2xl bg-background/80">
      <div className="container flex items-center justify-between h-full px-6">
        {/* Logo */}
        <Link to="/app" className="flex items-center gap-2 group">
          <span className="text-xl font-bold bg-gradient-to-r from-primary via-primary/80 to-primary bg-clip-text text-transparent">
            Безмятежные
          </span>
        </Link>

        {/* Right - Notifications & Avatar */}
        <div className="flex items-center gap-3">
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
