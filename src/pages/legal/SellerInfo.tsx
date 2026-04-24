import { User, Mail, MapPin, FileText } from "lucide-react";
import { LegalPageLayout } from "@/components/legal/LegalPageLayout";

export default function SellerInfo() {
  return (
    <LegalPageLayout 
      title="Информация о продавце" 
      lastUpdated="Последнее обновление: 27 декабря 2025 г."
      description="Контактные данные продавца приложения Безмятежные. ФИО, ИНН, адрес и email для связи."
    >
      <div className="space-y-6">
        <div className="p-6 rounded-2xl bg-accent/30 border border-border/40">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <User className="w-5 h-5 text-primary" />
            Продавец
          </h2>
          
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">ФИО / ИНН</p>
                <p className="font-medium">Морозов Алексей Александрович</p>
                <p className="text-sm text-muted-foreground">ИНН 773131839134</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Адрес</p>
                <p className="font-medium">Москва, Можайское шоссе д.40 кв.54</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Mail className="w-5 h-5 text-muted-foreground shrink-0 mt-0.5" />
              <div>
                <p className="text-sm text-muted-foreground">Email для связи</p>
                <a 
                  href="mailto:support@serenitypeople.ru" 
                  className="font-medium text-primary hover:underline"
                >
                  support@serenitypeople.ru
                </a>
              </div>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground text-center">
          По всем вопросам, связанным с работой приложения «Безмятежные», оплатой, возвратом средств или персональными данными, обращайтесь на указанный email.
        </p>
      </div>
    </LegalPageLayout>
  );
}
