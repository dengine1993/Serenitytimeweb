import { ArrowLeft, Heart } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import SEO from "@/components/SEO";

const About = () => {
  const navigate = useNavigate();

  return (
    <>
      <SEO 
        title="О приложении | Безмятежные"
        description="История создания приложения Безмятежные — инструменты для тех, кто знает тревогу изнутри"
      />
      
      <div className="min-h-screen bg-background">
        {/* Header */}
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

        {/* Content */}
        <main className="container max-w-2xl mx-auto px-4 py-8">
          <div className="space-y-8">
            {/* Greeting */}
            <div className="text-center space-y-4">
              <div className="w-20 h-20 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Heart className="w-10 h-10 text-primary" />
              </div>
              <h2 className="text-2xl font-bold text-foreground">Привет</h2>
            </div>

            {/* Story */}
            <div className="space-y-6 text-foreground/90 leading-relaxed">
              <p>
                Меня зовут <strong className="text-foreground">Алексей</strong>.
              </p>

              <p>
                Несколько лет я жил с постоянной тревогой. Панические атаки, бесконечные 
                поиски симптомов, непонимание со стороны окружающих... К этому добавлялись 
                Аспергер и СДВГ — мир казался слишком громким, хаотичным и непонятным.
              </p>

              <p>
                Я перепробовал многое: КПТ, медикаментозная терапия, различные техники. 
                Некоторые вещи помогали, но ничего не было собрано в одном месте и создано 
                именно для таких, как я — людей, которые знают эти симптомы изнутри.
              </p>

              <p className="text-lg font-medium text-foreground">
                Мой опыт вдохновил меня создать «Безмятежные».
              </p>

              <div className="p-6 rounded-2xl bg-accent/30 border border-border/30 space-y-4">
                <p className="text-sm text-muted-foreground">
                  Это не медицинское приложение и не замена врачу. Это инструменты, 
                  основанные на том, через что я прошёл и что мне было так необходимо 
                  в те времена:
                </p>
                
                <ul className="space-y-3 text-foreground/90">
                  <li className="flex items-start gap-3">
                    <span className="text-primary">—</span>
                    <span>разобраться в симптомах и знаниях о тревоге (навигатор)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary">—</span>
                    <span>получить эмпатичную поддержку (Сообщество и Джива — наш AI-психолог)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary">—</span>
                    <span>выразить чувства, когда нет слов (арт-терапия)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <span className="text-primary">—</span>
                    <span>находить маленькие радости каждый день (моменты хорошего)</span>
                  </li>
                </ul>
              </div>

              <p>
                Я создал его для тебя — если ты сейчас там, где был я.
              </p>

              <div className="text-center space-y-4 pt-4">
                <p className="text-xl font-medium text-foreground">
                  Ты не один.
                </p>
                <p className="text-xl font-medium text-primary">
                  Вместе справимся.
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
