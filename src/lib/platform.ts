import { Capacitor } from "@capacitor/core";

/**
 * Platform detection utility.
 * Returns true when running inside a Capacitor native shell (iOS/Android).
 */
export function isNativePlatform(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

export function getPlatform(): "web" | "ios" | "android" {
  try {
    const p = Capacitor.getPlatform();
    if (p === "ios" || p === "android") return p;
    return "web";
  } catch {
    return "web";
  }
}
