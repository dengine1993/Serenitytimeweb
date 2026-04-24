import { useState } from "react";
import { motion } from "framer-motion";
import { Key, LogOut, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";
import { PasswordChangeModal } from "./PasswordChangeModal";

export function SecuritySection() {
  const { signOut } = useAuth();
  const { language } = useI18n();
  const isRu = language === 'ru';
  
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const handleSignOut = async () => {
    setLoggingOut(true);
    try {
      await signOut();
    } catch (error) {
      toast.error(isRu ? 'Ошибка выхода' : 'Error signing out');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-4"
    >
      {/* Change Password */}
      <Card className="glass-card p-6">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Key className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">
                {isRu ? 'Изменить пароль' : 'Change Password'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {isRu ? 'Обновить пароль аккаунта' : 'Update your account password'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            onClick={() => setShowPasswordModal(true)}
          >
            <Key className="w-4 h-4 mr-2" />
            {isRu ? 'Изменить' : 'Change'}
          </Button>
        </div>
      </Card>

      <Separator className="bg-border" />

      {/* Sign Out */}
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Card className="glass-card p-6 cursor-pointer hover:bg-muted/50 transition-colors">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-red-500/20 flex items-center justify-center flex-shrink-0">
                  <LogOut className="w-6 h-6 text-red-400" />
                </div>
                <div>
                  <h3 className="font-semibold text-foreground">
                    {isRu ? 'Выйти из аккаунта' : 'Sign Out'}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {isRu ? 'Выход из текущей сессии' : 'Sign out of current session'}
                  </p>
                </div>
              </div>
              <Button variant="ghost" className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </Card>
        </AlertDialogTrigger>
        <AlertDialogContent className="glass-card border-border">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-foreground">
              {isRu ? 'Выйти из аккаунта?' : 'Sign out?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {isRu 
                ? 'Ты можешь войти обратно в любое время.'
                : 'You can sign back in at any time.'
              }
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>
              {isRu ? 'Отмена' : 'Cancel'}
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSignOut}
              disabled={loggingOut}
              className="bg-destructive hover:bg-destructive/90"
            >
              {loggingOut && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isRu ? 'Выйти' : 'Sign Out'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <PasswordChangeModal
        open={showPasswordModal}
        onOpenChange={setShowPasswordModal}
      />
    </motion.div>
  );
}
