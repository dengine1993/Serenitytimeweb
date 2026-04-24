import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { migrateStorage } from "./lib/storage";

// Network status monitor (shows toasts on connection changes)
import { useNetworkStatus } from "./hooks/useNetworkStatus";

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
