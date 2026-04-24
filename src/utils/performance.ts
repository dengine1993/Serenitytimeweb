// Performance utilities for adaptive quality based on device capabilities

export type DevicePerformance = 'high' | 'medium' | 'low';

/**
 * Detect device performance level
 * Returns 'high', 'medium', or 'low' based on device capabilities
 */
export const getDevicePerformance = (): DevicePerformance => {
  // Check if running in browser
  if (typeof window === 'undefined') return 'medium';

  // Check for mobile devices
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
  
  // Check hardware concurrency (CPU cores)
  const cores = navigator.hardwareConcurrency || 2;
  
  // Check device memory (if available)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const memory = (navigator as any).deviceMemory || 4;
  
  // Check screen size
  const screenSize = window.innerWidth * window.innerHeight;
  const isSmallScreen = screenSize < 1000000; // ~1024x768

  // Determine performance level
  if (isMobile) {
    // Mobile devices
    if (cores >= 8 && memory >= 6) return 'high';
    if (cores >= 4 && memory >= 3) return 'medium';
    return 'low';
  } else {
    // Desktop devices
    if (cores >= 8 && memory >= 8 && !isSmallScreen) return 'high';
    if (cores >= 4 && memory >= 4) return 'medium';
    return 'low';
  }
};

/**
 * Get optimized particle count based on device performance
 */
export const getOptimalParticleCount = (baseCount: number): number => {
  const performance = getDevicePerformance();
  
  switch (performance) {
    case 'high':
      return baseCount;
    case 'medium':
      return Math.floor(baseCount * 0.5);
    case 'low':
      return Math.floor(baseCount * 0.25);
    default:
      return baseCount;
  }
};

/**
 * Check if device should use reduced motion
 */
export const shouldReduceMotion = (): boolean => {
  if (typeof window === 'undefined') return false;
  
  const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
  return mediaQuery.matches;
};

export const shouldUseSimpleEffects = (): boolean => {
  if (typeof window === 'undefined') return false;
  return shouldReduceMotion() || getDevicePerformance() === 'low';
};

/**
 * Get optimal 3D quality settings
 */
export const get3DQualitySettings = () => {
  const performance = getDevicePerformance();
  
  return {
    pixelRatio: performance === 'low' ? 1 : Math.min(window.devicePixelRatio, 2),
    shadows: performance !== 'low',
    antialias: performance === 'high',
    powerPreference: performance === 'low' ? 'low-power' : 'high-performance',
  };
};

/**
 * Debounce function for performance optimization
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout;
  
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

/**
 * Request idle callback wrapper with fallback
 */
export const requestIdleCallback = (callback: () => void, timeout = 1000) => {
  if (typeof window === 'undefined') return;
  
  if ('requestIdleCallback' in window) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (window as any).requestIdleCallback(callback, { timeout });
  } else {
    setTimeout(callback, 1);
  }
};
