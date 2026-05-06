import { ArrowLeft } from "lucide-react";
import { useEffect, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import { useLegalModal, type LegalDocType } from "./LegalModalProvider";
import { PrivacyContent, PrivacyMeta } from "./content/PrivacyContent";
import { OfferContent, OfferMeta } from "./content/OfferContent";
import { DisclaimerContent, DisclaimerMeta } from "./content/DisclaimerContent";
import { RefundContent, RefundMeta } from "./content/RefundContent";
import { SellerInfoContent, SellerInfoMeta } from "./content/SellerInfoContent";

interface LegalDocumentModalProps {
  type: LegalDocType;
  open: boolean;
  onClose: () => void;
  zIndex?: number;
}

const META: Record<LegalDocType, { title: string; lastUpdated: string }> = {
  privacy: PrivacyMeta,
  offer: OfferMeta,
  disclaimer: DisclaimerMeta,
  refund: RefundMeta,
  seller: SellerInfoMeta,
};

export function LegalDocumentModal({ type, open, onClose, zIndex = 200 }: LegalDocumentModalProps) {
  const { openLegal } = useLegalModal();
  const meta = META[type];

  // Esc для закрытия
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Блокируем скролл боди пока модалка открыта
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const renderLink = (target: LegalDocType, label: string): ReactNode => (
    <button
      type="button"
      onClick={() => openLegal(target)}
      className="text-primary underline-offset-2 hover:underline font-medium inline"
    >
      {label}
    </button>
  );

  const renderBody = () => {
    switch (type) {
      case 'privacy':    return <PrivacyContent renderLink={renderLink} />;
      case 'offer':      return <OfferContent renderLink={renderLink} />;
      case 'disclaimer': return <DisclaimerContent renderLink={renderLink} />;
      case 'refund':     return <RefundContent renderLink={renderLink} />;
      case 'seller':     return <SellerInfoContent />;
    }
  };

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 animate-in fade-in duration-200"
      style={{ zIndex }}
      role="dialog"
      aria-modal="true"
      aria-label={meta.title}
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Sheet container */}
      <div
        className={cn(
          "absolute left-0 right-0 bottom-0 top-0",
          "sm:top-8 sm:left-1/2 sm:-translate-x-1/2 sm:max-w-3xl sm:w-full sm:bottom-8 sm:rounded-3xl",
          "bg-background shadow-2xl border border-border/40",
          "flex flex-col overflow-hidden",
          "animate-in slide-in-from-bottom duration-300"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-10 bg-background/90 backdrop-blur-lg border-b border-border/40">
          <div className="px-4 py-3 flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="shrink-0"
              aria-label="Назад"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div className="flex-1 min-w-0">
              <h2 className="text-base font-semibold truncate">{meta.title}</h2>
              <p className="text-xs text-muted-foreground truncate">{meta.lastUpdated}</p>
            </div>
          </div>
        </header>

        {/* Body */}
        <ScrollArea className="flex-1">
          <div className="container max-w-3xl mx-auto px-4 py-6 pb-24">
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {renderBody()}
            </div>

            <footer className="mt-12 pt-6 border-t border-border/40 text-center text-sm text-muted-foreground space-y-3">
              <p>
                Вопросы:{' '}
                <a href="mailto:info@newdawnjourney.com" className="text-primary hover:underline">
                  info@newdawnjourney.com
                </a>
              </p>
              <Button onClick={onClose} variant="outline" size="sm">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Назад
              </Button>
            </footer>
          </div>
        </ScrollArea>
      </div>
    </div>,
    document.body
  );
}
