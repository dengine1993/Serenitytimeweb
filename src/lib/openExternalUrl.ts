import { Capacitor } from '@capacitor/core';

/**
 * Открывает внешний URL.
 * - В нативном Capacitor-приложении: системный браузер (Custom Tabs / SFSafariViewController)
 *   через @capacitor/browser. Это требование Google Play / App Store для платежей
 *   третьих сторон (ЮKassa) — нельзя проводить их в встроенном WebView.
 * - В вебе: обычный редирект через window.location.href.
 */
export async function openExternalUrl(url: string): Promise<void> {
  if (Capacitor.isNativePlatform()) {
    const { Browser } = await import('@capacitor/browser');
    await Browser.open({
      url,
      presentationStyle: 'fullscreen',
      windowName: '_self',
    });
    return;
  }
  window.location.href = url;
}
