import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ShieldAlert, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { ConsentCheckboxes, validateConsents } from "@/components/legal/ConsentCheckboxes";
import { logDisclaimerConsent } from "@/lib/consentLogger";
import { LEGAL_VERSIONS } from "@/lib/legalVersions";
import { toast } from "sonner";

interface AiDisclaimerGateProps {
  /** Where this gate is shown — used in copy and analytics */
  context: "ai-chat" | "crisis";
  children: React.ReactNode;
}

/**
 * Hard gate: blocks access to AI/Crisis features until the user has explicitly
 * accepted the disclaimer (not medical assistance / does not replace a specialist / risks of AI).
 * Required by ст. 10 ЗоЗПП + ст. 9 152-ФЗ (informed consent per service).
 */
export function AiDisclaimerGate({ context, children }: AiDisclaimerGateProps) {
  const [checking, setChecking] = useState(true);
  const [accepted, setAccepted] = useState(false);
  const [consents, setConsents] = useState<{ disclaimer?: boolean }>({});
  const [error, setError] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        if (!cancelled) {
          setAccepted(true);
          setChecking(false);
        }
        return;
      }
      const { data } = await supabase
        .from("profiles")
        .select("disclaimer_accepted_at, disclaimer_version")
        .eq("user_id", user.id)
        .maybeSingle();

      const isCurrent =
        !!data?.disclaimer_accepted_at &&
        data?.disclaimer_version === LEGAL_VERSIONS.disclaimer;

      if (!cancelled) {
        setAccepted(isCurrent);
        setChecking(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const handleAccept = async () => {
    if (!validateConsents("ai-disclaimer", consents)) {
      setError(true);
      return;
    }
    setError(false);
    setSubmitting(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from("profiles")
          .update({
            disclaimer_accepted_at: new Date().toISOString(),
            disclaimer_version: LEGAL_VERSIONS.disclaimer,
          })
          .eq("user_id", user.id);
        await logDisclaimerConsent();
      }
      setAccepted(true);
    } catch (err) {
      toast.error("Не удалось сохранить согласие. Попробуйте ещё раз.");
    } finally {
      setSubmitting(false);
    }
  };

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (accepted) return <>{children}</>;

  const title =
    context === "crisis"
      ? "Перед началом — важное"
      : "Прежде чем начать общение";

  return (
    <Dialog open modal>
      <DialogContent
        className="max-w-md bg-background border-border"
        onPointerDownOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <div className="w-12 h-12 rounded-full bg-amber-500/10 flex items-center justify-center mx-auto mb-2">
            <ShieldAlert className="w-6 h-6 text-amber-500" />
          </div>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center text-sm leading-relaxed pt-2">
            Джива — ИИ-собеседник для тёплой эмоциональной поддержки, 18+. Это <strong>не</strong> медицинская,
            психотерапевтическая или психологическая помощь. Не заменяет врача и специалиста, не является
            экстренной помощью. ИИ может ошибаться. При угрозе жизни — 112.
          </DialogDescription>
        </DialogHeader>

        <div className="pt-2">
          <ConsentCheckboxes
            variant="ai-disclaimer"
            consents={consents}
            onChange={setConsents}
            error={error}
          />
        </div>

        <Button
          onClick={handleAccept}
          disabled={submitting}
          className="w-full mt-2"
        >
          {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : "Понимаю и продолжаю"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
