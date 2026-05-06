import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Capacitor configuration for «Восход» / New Dawn.
 *
 * Production build (App Store / Google Play): WebView грузит локальный `dist/`.
 *   1. `npm run build && npx cap sync`.
 *
 * Dev hot-reload (опционально, только локально):
 *   Раскомментируй блок `server` ниже и подставь свой preview URL.
 *   НЕ коммить раскомментированный server — это блокер для релиза.
 */
const config: CapacitorConfig = {
  appId: "com.newdawnjourney.app",
  appName: "Восход",
  webDir: "dist",
  // server: {
  //   url: "https://id-preview--93256e61-c89b-49f4-9c38-63774cb292a2.lovable.app?forceHideBadge=true",
  //   cleartext: true,
  // },
  ios: {
    contentInset: "always",
  },
  android: {
    allowMixedContent: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 1500,
      backgroundColor: "#1a0a2e",
      androidSplashResourceName: "splash",
      showSpinner: false,
    },
    StatusBar: {
      // Edge-to-edge для Android 15+: контент идёт под статус-бар,
      // фон статус-бара прозрачный, иконки светлые на тёмной теме.
      style: "DARK",
      backgroundColor: "#00000000",
      overlaysWebView: true,
    },
  },
};

export default config;
