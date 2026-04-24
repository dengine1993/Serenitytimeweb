import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import SEO from "@/components/SEO";

interface LegalPageLayoutProps {
  title: string;
  lastUpdated: string;
  description?: string;
  children: React.ReactNode;
}

export function LegalPageLayout({ title, lastUpdated, description, children }: LegalPageLayoutProps) {
  const navigate = useNavigate();

  return (
    <>
      <SEO title={title} description={description} />
      <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-lg border-b border-border/40">
        <div className="container max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="shrink-0"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-semibold truncate">{title}</h1>
            <p className="text-xs text-muted-foreground">{lastUpdated}</p>
          </div>
        </div>
      </header>

      <ScrollArea className="h-[calc(100dvh-73px)]">
        <main className="container max-w-3xl mx-auto px-4 py-6">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {children}
          </div>

          <footer className="mt-12 pt-6 border-t border-border/40 text-center text-sm text-muted-foreground">
            <p>Вопросы: <a href="mailto:support@serenitypeople.ru" className="text-primary hover:underline">support@serenitypeople.ru</a></p>
          </footer>
        </main>
      </ScrollArea>
    </div>
    </>
  );
}
