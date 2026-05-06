import { ArrowLeft, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const About = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="О приложении | Восход"
        description="История проекта Восход — пространство для тех, кто хочет расти каждый день и становиться лучшей версией себя."
      />
      
      <div className="min-h-screen bg-background">
        <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/40">
          <div className="container max-w-2xl mx-auto px-4 py-4 flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="rounded-full"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <h1 className="text-lg font-semibold">О приложении</h1>
          </div>
        </header>

        <main className="container max-w-2xl mx-auto px-4 py-8">
          <div className="space-y-8">
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Привет</h2>
            </div>

            <div className="space-y-6 text-foreground/90 leading-relaxed">
              <p>
                Меня зовут <strong className="text-foreground">Алексей</strong>.
              </p>

              <p>
                Я делал «Восход» для людей, которые хотят расти — каждый день делать
                маленький шаг к лучшей версии себя. Не ждать «когда станет легче»,
                а возвращаться к себе утром за утром и двигаться вперёд в своём темпе.
              </p>

              <p className="text-lg font-medium text-foreground">
                Восход — это место, куда можно прийти как есть.
              </p>

              <div className="p-6 rounded-2xl bg-accent/30 border border-border/30 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Что внутри:
                </p>
                
                <ul className="space-y-3 text-foreground/90">
                  <li className="flex items-start gap-3">
                    <span className="text-primary">—</span>
                    <span>Джива — AI-Друг, с которой можно думать вслух и разбирать день</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary">—</span>
                    <span>Сообщество людей, которые тоже идут вперёд — без оценок и советов сверху</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary">—</span>
                    <span>«Образ дня» — выразить то, для чего нет слов</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary">—</span>
                    <span>Лента «Маленькие Восходы» — фиксировать шаги вперёд каждый день</span>
                  </li>
                </ul>
              </div>

              <p>
                Если хочешь расти и не оставаться один на этом пути — добро пожаловать.
              </p>

              <div className="text-center space-y-4 pt-4">
                <p className="text-xl font-medium text-primary">
                  Каждое утро — твой новый шаг.
                </p>
                <p className="text-lg text-foreground/80 flex items-center justify-center gap-2">
                  Алексей <span className="text-primary">💙</span>
                </p>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
};

export default About;
