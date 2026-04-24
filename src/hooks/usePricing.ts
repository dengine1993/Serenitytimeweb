import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProductPrices {
  premiumMonthly: number;
  premiumYearly: number;
}

const DEFAULT_PRICES: ProductPrices = {
  premiumMonthly: 690,
  premiumYearly: 6990,
};

function parseProducts(value: unknown): ProductPrices | null {
  try {
    const parsed = typeof value === 'string' ? JSON.parse(value) : value;
    const products = (parsed as { products?: Record<string, { amount?: { value?: number } }> })?.products;
    if (!products) return null;
    return {
      premiumMonthly: products.premium_subscription_monthly?.amount?.value ?? DEFAULT_PRICES.premiumMonthly,
      premiumYearly: products.premium_subscription_yearly?.amount?.value ?? DEFAULT_PRICES.premiumYearly,
    };
  } catch {
    return null;
  }
}

export function usePricing() {
  const [prices, setPrices] = useState<ProductPrices>(DEFAULT_PRICES);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    const fetchPrices = async () => {
      try {
        const { data, error } = await supabase
          .from('app_config')
          .select('value')
          .eq('key', 'product_catalog')
          .maybeSingle();
        if (error) {
          console.warn('[usePricing] Error fetching prices:', error);
          return;
        }
        const next = parseProducts(data?.value);
        if (next && !cancelled) setPrices(next);
      } catch (err) {
        console.warn('[usePricing] Fetch error:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchPrices();

    // Realtime: react to admin price updates without refresh
    const channel = supabase
      .channel('app_config:product_catalog')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_config', filter: 'key=eq.product_catalog' },
        (payload) => {
          const next = parseProducts((payload.new as { value?: unknown })?.value);
          if (next) setPrices(next);
        }
      )
      .subscribe();

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
    };
  }, []);

  const fullYearlyPrice = prices.premiumMonthly * 12;
  const yearlySavings = fullYearlyPrice - prices.premiumYearly;
  const yearlyDiscountPercent = fullYearlyPrice > 0
    ? Math.round((yearlySavings / fullYearlyPrice) * 100)
    : 0;
  const monthlyEquivalent = Math.round(prices.premiumYearly / 12);
  const savingsPerMonth = prices.premiumMonthly - monthlyEquivalent;
  const freeMonths = prices.premiumMonthly > 0
    ? Math.round(yearlySavings / prices.premiumMonthly)
    : 0;

  return {
    ...prices,
    fullYearlyPrice,
    yearlySavings,
    yearlyDiscountPercent,
    monthlyEquivalent,
    savingsPerMonth,
    freeMonths,
    loading,
  };
}
