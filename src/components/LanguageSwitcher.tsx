import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n, setLanguage } from "@/hooks/useI18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const LanguageSwitcher = () => {
  const { language, t } = useI18n();

  const handleLanguageChange = (lang: 'ru' | 'en') => {
    setLanguage(lang);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon"
          className="text-foreground hover:bg-muted/50"
          aria-label={t('languageSwitcher.changeLanguage')}
        >
          <Globe className="h-5 w-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent 
        align="end"
        className="bg-card/95 backdrop-blur-md border-border/50"
      >
        <DropdownMenuItem
          onClick={() => handleLanguageChange('ru')}
          className={`cursor-pointer ${
            language === 'ru' ? 'bg-muted' : ''
          }`}
        >
          🇷🇺 {t('languageSwitcher.ru')}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handleLanguageChange('en')}
          className={`cursor-pointer ${
            language === 'en' ? 'bg-muted' : ''
          }`}
        >
          🇬🇧 {t('languageSwitcher.en')}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
