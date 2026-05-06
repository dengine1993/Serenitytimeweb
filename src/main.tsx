import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { migrateStorage } from "./lib/storage";
import { initSentry } from "./lib/sentry";

// Network status monitor (shows toasts on connection changes)
import { useNetworkStatus } from "./hooks/useNetworkStatus";

// Init Sentry (no-op if VITE_SENTRY_DSN not set)
initSentry();

// Migrate storage before app renders
migrateStorage();

function Root() {
  // Initialize network status monitoring at app root level
  useNetworkStatus();
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  );
}

// SW регистрация теперь через vite-plugin-pwa (PWAUpdatePrompt компонент)
createRoot(document.getElementById("root")!).render(<Root />);
