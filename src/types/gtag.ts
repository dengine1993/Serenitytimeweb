// Google Analytics gtag types
export interface GTagEvent {
  event_category?: string;
  event_label?: string;
  value?: number;
  [key: string]: string | number | boolean | undefined;
}

export interface WindowWithGTag extends Window {
  gtag?: (
    command: 'event' | 'config' | 'set',
    targetId: string,
    config?: GTagEvent
  ) => void;
}

// Type guard to check if gtag exists
export function hasGTag(window: Window): window is WindowWithGTag {
  return 'gtag' in window && typeof (window as WindowWithGTag).gtag === 'function';
}
