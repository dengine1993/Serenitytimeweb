import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { LegalDocumentModal } from "./LegalDocumentModal";

export type LegalDocType = 'privacy' | 'offer' | 'disclaimer' | 'refund' | 'seller';

interface OpenLegalOptions {
  /** Колбэк, вызываемый когда стек документов полностью закрыт */
  onAllClosed?: () => void;
}

interface LegalModalContextValue {
  openLegal: (type: LegalDocType, options?: OpenLegalOptions) => void;
  closeLegal: () => void;
  closeAll: () => void;
  hasOpenLegal: boolean;
}

const LegalModalContext = createContext<LegalModalContextValue | null>(null);

export function useLegalModal() {
  const ctx = useContext(LegalModalContext);
  if (!ctx) throw new Error("useLegalModal must be used inside LegalModalProvider");
  return ctx;
}

export function LegalModalProvider({ children }: { children: ReactNode }) {
  const [stack, setStack] = useState<LegalDocType[]>([]);
  // Колбэк закрытия — устанавливается тем, кто открыл первый документ в стеке
  const [onAllClosed, setOnAllClosed] = useState<(() => void) | null>(null);

  const openLegal = useCallback((type: LegalDocType, options?: OpenLegalOptions) => {
    setStack((prev) => {
      // Если стек пуст — запоминаем колбэк инициатора
      if (prev.length === 0 && options?.onAllClosed) {
        setOnAllClosed(() => options.onAllClosed!);
      }
      return [...prev, type];
    });
  }, []);

  const closeLegal = useCallback(() => {
    setStack((prev) => {
      const next = prev.slice(0, -1);
      if (next.length === 0 && onAllClosed) {
        // Запускаем после закрытия модалки
        const cb = onAllClosed;
        setOnAllClosed(null);
        // Микро-таска чтобы дать React закрыть портал
        queueMicrotask(() => cb());
      }
      return next;
    });
  }, [onAllClosed]);

  const closeAll = useCallback(() => {
    setStack([]);
    if (onAllClosed) {
      const cb = onAllClosed;
      setOnAllClosed(null);
      queueMicrotask(() => cb());
    }
  }, [onAllClosed]);

  return (
    <LegalModalContext.Provider value={{ openLegal, closeLegal, closeAll, hasOpenLegal: stack.length > 0 }}>
      {children}
      {stack.map((type, idx) => (
        <LegalDocumentModal
          key={`${type}-${idx}`}
          type={type}
          open
          onClose={closeLegal}
          zIndex={200 + idx * 5}
        />
      ))}
    </LegalModalContext.Provider>
  );
}
