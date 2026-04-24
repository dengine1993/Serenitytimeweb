import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Pluralization helper for Russian language
 * @param count - The number to pluralize
 * @param forms - Array of three forms: [one, few, many]
 * Example: pluralize(1, ['день', 'дня', 'дней']) => 'день'
 * Example: pluralize(2, ['день', 'дня', 'дней']) => 'дня'
 * Example: pluralize(5, ['день', 'дня', 'дней']) => 'дней'
 */
export function pluralize(
  count: number,
  forms: [string, string, string]
): string {
  const n = Math.abs(count) % 100;
  const n1 = n % 10;
  
  if (n > 10 && n < 20) return forms[2]; // 11-19 => many
  if (n1 > 1 && n1 < 5) return forms[1]; // 2-4 => few
  if (n1 === 1) return forms[0]; // 1 => one
  return forms[2]; // 0, 5-9 => many
}
