import { useState } from "react";
import { Loader2, AlertTriangle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useI18n } from "@/hooks/useI18n";

interface DeleteAccountModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function DeleteAccountModal({ open, onOpenChange }: DeleteAccountModalProps) {
  const { user, signOut } = useAuth();
  const { language } = useI18n();
  const isRu = language === 'ru';
  
  const [confirmText, setConfirmText] = useState('');
  const [loading, setLoading] = useState(false);
  
  const confirmWord = isRu ? 'УДАЛИТЬ' : 'DELETE';

  const handleDelete = async () => {
    if (confirmText !== confirmWord) {
      toast.error(isRu ? `Введи "${confirmWord}" для подтверждения` : `Type "${confirmWord}" to confirm`);
      return;
    }
    
    if (!user) return;
    
    setLoading(true);
    
    try {
      // Call edge function to delete user data
      const { error } = await supabase.functions.invoke('delete-user-data', {
        body: { userId: user.id }
      });
      
      if (error) throw error;
      
      toast.success(isRu ? 'Аккаунт удалён' : 'Account deleted');
      await signOut();
    } catch (error) {
      console.error('Delete account error:', error);
      toast.error(isRu ? 'Ошибка при удалении аккаунта' : 'Error deleting account');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md glass-card border-destructive/30">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-destructive">
            <AlertTriangle className="w-5 h-5" />
            {isRu ? 'Удалить аккаунт' : 'Delete Account'}
          </DialogTitle>
          <DialogDescription className="text-muted-foreground">
            {isRu 
              ? 'Это действие необратимо. Все твои данные будут удалены навсегда.'
              : 'This action is irreversible. All your data will be permanently deleted.'
            }
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/20">
            <p className="text-sm text-destructive">
              {isRu 
                ? `Для подтверждения введи "${confirmWord}"`
                : `To confirm, type "${confirmWord}"`
              }
            </p>
          </div>
          
          <Input
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder={confirmWord}
            className="bg-muted/30 border-border"
          />
          
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="flex-1"
            >
              {isRu ? 'Отмена' : 'Cancel'}
            </Button>
            <Button
              onClick={handleDelete}
              disabled={loading || confirmText !== confirmWord}
              className="flex-1 bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            >
              {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {isRu ? 'Удалить навсегда' : 'Delete Forever'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
