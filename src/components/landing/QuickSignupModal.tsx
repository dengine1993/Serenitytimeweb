import { Link } from "react-router-dom";
import { ArrowRight, BookHeart, Users, MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/hooks/useI18n";

interface QuickSignupModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  path?: "breath" | "anchor";
}

export const QuickSignupModal = ({ open, onOpenChange, path = "breath" }: QuickSignupModalProps) => {
  const { t } = useI18n();

  const authState = path === "anchor" ? { returnUrl: "/premium", path } : { path };

  const pillars = [
    { icon: null, isSos: true, key: "index.twoPaths.signupModal.pillars.sos", color: "text-white", bg: "bg-red-600", border: "border-red-400/40" },
    { icon: BookHeart, isSos: false, key: "index.twoPaths.signupModal.pillars.diary", color: "text-emerald-300", bg: "bg-emerald-500/10", border: "border-emerald-500/25" },
    { icon: Users, isSos: false, key: "index.twoPaths.signupModal.pillars.community", color: "text-amber-300", bg: "bg-amber-500/10", border: "border-amber-500/25" },
    { icon: MessageCircle, isSos: false, key: "index.twoPaths.signupModal.pillars.jiva", color: "text-violet-300", bg: "bg-violet-500/10", border: "border-violet-500/25" },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gradient-to-br from-slate-950 via-slate-900 to-emerald-950/40 border-emerald-500/30 text-white max-w-md rounded-3xl">
        <div className="flex flex-col items-center text-center pt-2">
          <DialogHeader className="space-y-2">
            <DialogTitle className="text-xl sm:text-2xl font-bold text-white text-center leading-snug">
              {t("index.twoPaths.signupModal.title")}
            </DialogTitle>
            <DialogDescription className="text-sm text-white/70 text-center">
              {t("index.twoPaths.signupModal.subtitle")}
            </DialogDescription>
          </DialogHeader>

          {/* 4 pillars row */}
          <div className="flex justify-between gap-2 w-full mt-5 mb-2">
            {pillars.map((p) => {
              const Icon = p.icon;
              return (
                <div key={p.key} className="flex-1 flex flex-col items-center gap-1.5">
                  <div className={`w-10 h-10 rounded-xl ${p.bg} border ${p.border} flex items-center justify-center ${p.isSos ? "shadow-[0_0_12px_rgba(239,68,68,0.5)]" : ""}`}>
                    {p.isSos ? (
                      <span className="text-[10px] font-extrabold tracking-widest text-white">SOS</span>
                    ) : Icon ? (
                      <Icon className={`w-5 h-5 ${p.color}`} />
                    ) : null}
                  </div>
                  <span className="text-[10px] sm:text-xs text-white/70 font-medium">
                    {t(p.key)}
                  </span>
                </div>
              );
            })}
          </div>

          <Link to="/auth" state={authState} className="block w-full mt-4">
            <Button
              className="w-full py-6 text-base font-semibold rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-[0_0_30px_rgba(16,185,129,0.5)] hover:shadow-[0_0_50px_rgba(16,185,129,0.7)] border border-emerald-400/40 transition-all"
              onClick={() => onOpenChange(false)}
            >
              <span className="flex items-center justify-center gap-2">
                {t("index.twoPaths.signupModal.cta")}
                <ArrowRight className="w-4 h-4" />
              </span>
            </Button>
          </Link>

          <Link
            to="/auth?mode=signin"
            className="text-sm text-white/60 hover:text-white/90 transition-colors mt-4"
            onClick={() => onOpenChange(false)}
          >
            {t("index.twoPaths.signupModal.haveAccount")}
          </Link>
        </div>
      </DialogContent>
    </Dialog>
  );
};
