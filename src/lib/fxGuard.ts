// FX Guard: Protects against rapid currency fluctuations with hysteresis

interface FxConfig {
  usd_rub: number;
  fx_markup_pct: number;
  fx_hysteresis_pct: number;
}

interface FxGuardResult {
  shouldUpdate: boolean;
  newPrice?: number;
  reason: string;
}

/**
 * Determines if price should be adjusted based on FX changes
 * Uses hysteresis to prevent yo-yoing within markup band
 */
export function checkFxGuard(
  basePriceRub: number, // e.g., 890
  currentFxRate: number, // current USD/RUB
  lastFxRate: number, // rate when last updated
  config: FxConfig
): FxGuardResult {
  const drift = Math.abs((currentFxRate - lastFxRate) / lastFxRate);

  // Check if drift exceeds hysteresis threshold
  if (drift <= config.fx_hysteresis_pct) {
    return {
      shouldUpdate: false,
      reason: `Drift ${(drift * 100).toFixed(2)}% within hysteresis ${(config.fx_hysteresis_pct * 100)}%`
    };
  }

  // Calculate new price with markup
  const baseUsdPrice = basePriceRub / lastFxRate;
  const newPriceMin = baseUsdPrice * currentFxRate * (1 + config.fx_markup_pct * 0.5);
  const newPriceMax = baseUsdPrice * currentFxRate * (1 + config.fx_markup_pct);

  // Use midpoint of markup range
  const newPrice = Math.round((newPriceMin + newPriceMax) / 2);

  return {
    shouldUpdate: true,
    newPrice,
    reason: `FX drift ${(drift * 100).toFixed(2)}% exceeds hysteresis, adjusting price`
  };
}

/**
 * Admin helper to manually adjust FX and recalculate prices
 */
export async function updateFxRates(
  newUsdRub: number,
  markupPct: number = 0.2
): Promise<number> {
  // This would be called from admin panel
  // Returns suggested new price
  const basePriceUsd = 890 / 82; // ~10.85 USD
  return Math.round(basePriceUsd * newUsdRub * (1 + markupPct));
}
