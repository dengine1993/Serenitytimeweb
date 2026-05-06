import { lazy, Suspense, useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { AdminRoute } from "./AdminRoute";
import { AdminSidebar } from "./AdminSidebar";
import { useModerationRealtime } from "@/hooks/useModerationRealtime";
import { Badge } from "@/components/ui/badge";
import { Bell } from "lucide-react";

const AnimatedShaderBackground = lazy(() => import("@/components/ui/animated-shader-background"));

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
  description?: string;
}

export function AdminLayout({ children, title, description }: AdminLayoutProps) {
  const location = useLocation();
  const [newReportsCount, setNewReportsCount] = useState(0);

  useModerationRealtime(() => {
    setNewReportsCount((prev) => prev + 1);
  });

  // Reset counter when navigating to moderation page (client-side routing aware)
  useEffect(() => {
    if (location.pathname === '/admin/moderation') {
      setNewReportsCount(0);
    }
  }, [location.pathname]);

  return (
    <AdminRoute>
      <div className="min-h-screen relative">
        <Suspense fallback={null}>
          <AnimatedShaderBackground />
        </Suspense>
        
        <AdminSidebar />
        
        {/* Realtime notification indicator */}
        {newReportsCount > 0 && (
          <div className="fixed top-4 right-4 z-50 lg:right-8">
            <a 
              href="/admin/moderation"
              className="flex items-center gap-2 px-4 py-2 bg-amber-500/20 border border-amber-500/30 rounded-full backdrop-blur-sm hover:bg-amber-500/30 transition-colors"
            >
              <Bell className="h-4 w-4 text-amber-400 animate-pulse" />
              <span className="text-sm text-amber-400 font-medium">
                {newReportsCount} новых жалоб
              </span>
              <Badge className="bg-amber-500 text-white text-xs">
                {newReportsCount}
              </Badge>
            </a>
          </div>
        )}
        
        {/* Main content */}
        <main className="ml-0 lg:ml-64 min-h-screen relative z-10">
          <div className="p-4 lg:p-8 pt-16 lg:pt-8">
            {/* Page header */}
            <div className="mb-6 lg:mb-8">
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground">{title}</h1>
              {description && (
                <p className="text-sm lg:text-base text-muted-foreground mt-2">{description}</p>
              )}
            </div>
            
            {/* Page content */}
            {children}
          </div>
        </main>
      </div>
    </AdminRoute>
  );
}
