import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { HeartHandshake, Shield, Ban, Megaphone } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface CommunityRulesModalProps {
  onAccept: () => void;
  isLoggedIn: boolean;
}

export function CommunityRulesModal({ onAccept, isLoggedIn }: CommunityRulesModalProps) {
  const [accepted, setAccepted] = useState(false);
  const navigate = useNavigate();

  const rules = [
    { icon: HeartHandshake, text: 'Здесь только поддержка и доброта', color: 'text-pink-500' },
    
    { icon: Shield, text: 'Репорт нарушений через долгое нажатие', color: 'text-emerald-500' },
    { icon: Ban, text: 'Негатив и токсичность — бан', color: 'text-red-500' },
  ];

  const criticalRule = {
    icon: Megaphone,
    text: 'Реклама и спам — бан навсегда',
    color: 'text-orange-500',
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-b from-sky-50 via-blue-50 to-pink-50 dark:from-background dark:via-background dark:to-background">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-md"
      >
        <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-8 shadow-2xl border border-border/50">
          {/* Header */}
          <div className="text-center mb-8">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', delay: 0.2 }}
              className="w-20 h-20 mx-auto mb-4 rounded-full bg-gradient-to-br from-pink-100 to-blue-100 dark:from-pink-500/20 dark:to-blue-500/20 flex items-center justify-center"
            >
              <HeartHandshake className="h-10 w-10 text-pink-500" />
            </motion.div>
            <h1 className="text-2xl font-bold text-foreground mb-2">
              Правила Сообщества
            </h1>
            <p className="text-muted-foreground text-sm">
              Это безопасное пространство для всех ❤️
            </p>
          </div>

          {/* Rules */}
          <div className="space-y-4 mb-4">
            {rules.map((rule, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 + index * 0.1 }}
                className="flex items-center gap-4 p-4 rounded-2xl bg-background/50 border border-border/30"
              >
                <div className={`p-2 rounded-xl bg-background ${rule.color}`}>
                  <rule.icon className="h-5 w-5" />
                </div>
                <span className="text-sm font-medium text-foreground">
                  {rule.text}
                </span>
              </motion.div>
            ))}
          </div>

          {/* Critical Rule - Advertising Ban */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.7 }}
            className="flex items-center gap-4 p-4 rounded-2xl bg-orange-500/10 border-2 border-orange-500/30 mb-8"
          >
            <div className={`p-2 rounded-xl bg-orange-500/20 ${criticalRule.color}`}>
              <criticalRule.icon className="h-5 w-5" />
            </div>
            <span className="text-sm font-bold text-orange-600 dark:text-orange-400">
              {criticalRule.text}
            </span>
          </motion.div>

          {/* Checkbox */}
          <div className="flex items-center gap-3 mb-6 p-4 rounded-2xl bg-primary/5 border border-primary/20">
            <Checkbox
              id="accept-rules"
              checked={accepted}
              onCheckedChange={(checked) => setAccepted(checked === true)}
              className="data-[state=checked]:bg-primary"
            />
            <label
              htmlFor="accept-rules"
              className="text-sm font-medium text-foreground cursor-pointer"
            >
              Я принимаю правила сообщества
            </label>
          </div>

          {/* Action */}
          {isLoggedIn ? (
            <Button
              onClick={onAccept}
              disabled={!accepted}
              className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50"
            >
              Войти в Сообщество
            </Button>
          ) : (
            <div className="space-y-3">
              <Button
                onClick={() => navigate('/auth')}
                disabled={!accepted}
                className="w-full h-14 text-lg font-semibold rounded-2xl bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 disabled:opacity-50"
              >
                Войти или зарегистрироваться
              </Button>
              <p className="text-center text-xs text-muted-foreground">
                Для участия в чате нужна авторизация
              </p>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
