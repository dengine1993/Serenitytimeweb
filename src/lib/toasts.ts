import { toast as sonnerToast } from "sonner";
import { useI18n } from "@/hooks/useI18n";

// Toast wrapper that supports i18n keys
export const showToast = {
  error: (message: string) => sonnerToast.error(message),
  success: (message: string) => sonnerToast.success(message),
  info: (message: string) => sonnerToast.info(message),
};

// Re-export for backward compatibility
export const toast = sonnerToast;
