import { ArrowLeft, Home } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import SEO from "@/components/SEO";
import { useAuth } from "@/hooks/useAuth";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  description?: string;
  children: React.ReactNode;
}

export function LegalPageLayout({ title, lastUpdated, description, children }: LegalPageLayoutProps) {
  const navigate = useNavigate();
  const { user } = useAuth();

  const handleBack = () => {
    // Если есть история — назад, иначе на главную приложения/лендинг
    if (window.history.length > 1 && document.referrer) {
      navigate(-1);
    } else {
      navigate(user ? "/app" : "/");
    }
  };

  const handleHome = () => {
    navigate(user ? "/app" : "/");
  };

  return (
    <>
      <SEO title={title} description={description} />
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
          <div className="container max-w-3xl mx-auto px-4 py-4 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={handleBack}
              className="shrink-0"
              aria-label="Назад"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-semibold truncate">{title}</h1>
              <p className="text-xs text-muted-foreground">{lastUpdated}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleHome}
              className="shrink-0"
              aria-label={user ? "На главную приложения" : "На главную"}
            >
              <Home className="w-5 h-5" />
            </Button>
          </div>
        </header>

        <ScrollArea className="h-[calc(100dvh-73px)]">
          <main className="container max-w-3xl mx-auto px-4 py-6 pb-32">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {children}
            </div>

            <footer className="mt-12 pt-6 border-t border-border/40 text-center text-sm text-muted-foreground space-y-4">
              <p>Вопросы: <a href="mailto:info@newdawnjourney.com" className="text-primary hover:underline">info@newdawnjourney.com</a></p>
              <Button onClick={handleHome} variant="outline" size="sm">
                <Home className="w-4 h-4 mr-2" />
                {user ? "Вернуться в приложение" : "На главную"}
              </Button>
            </footer>
          </main>
        </ScrollArea>
      </div>
    </>
  );
}
