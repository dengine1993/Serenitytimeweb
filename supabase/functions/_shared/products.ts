import { getSupabaseClient } from './db.ts';

export type CurrencyCode = 'RUB';

export type ProductId =
  | 'premium_subscription_monthly'
  | 'premium_subscription_yearly';

export type ProductEntitlement = {
  kind: 'subscription';
  plan: 'premium';
  intervalMonths: number;
};

export interface ProductDefinition {
  id: ProductId;
  name: string;
  description: string;
  amount: {
    value: number;
    currency: CurrencyCode;
  };
  paymentType: 'subscription' | 'oneoff';
  entitlement: ProductEntitlement;
}

const DEFAULT_PRODUCT_CATALOG: Record<ProductId, ProductDefinition> = {
  premium_subscription_monthly: {
    id: 'premium_subscription_monthly',
    name: 'Premium Monthly Subscription',
    description: 'Ежемесячная подписка Premium',
    amount: { value: 690, currency: 'RUB' },
    paymentType: 'subscription',
    entitlement: {
      kind: 'subscription',
      plan: 'premium',
      intervalMonths: 1,
    },
  },
  premium_subscription_yearly: {
    id: 'premium_subscription_yearly',
    name: 'Premium Yearly Subscription',
    description: 'Годовая подписка Premium',
    amount: { value: 6990, currency: 'RUB' },
    paymentType: 'subscription',
    entitlement: {
      kind: 'subscription',
      plan: 'premium',
      intervalMonths: 12,
    },
  },
};

let cachedCatalog: Record<string, ProductDefinition> | null = null;
let lastCatalogFetch = 0;
const CATALOG_CACHE_TTL_MS = 60 * 1000;

function isValidProductDefinition(value: unknown): value is ProductDefinition {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as ProductDefinition;
  return (
    typeof candidate.id === 'string' &&
    typeof candidate.name === 'string' &&
    typeof candidate.description === 'string' &&
    typeof candidate.amount?.value === 'number' &&
    typeof candidate.amount?.currency === 'string' &&
    (candidate.paymentType === 'subscription' || candidate.paymentType === 'oneoff') &&
    typeof candidate.entitlement === 'object'
  );
}

async function fetchCatalogFromConfig(): Promise<Record<string, ProductDefinition> | null> {
  try {
    const supabase = getSupabaseClient();
    const { data } = await supabase
      .from('app_config')
      .select('value')
      .eq('key', 'product_catalog')
      .maybeSingle();

    const rawValue = typeof data?.value === 'string' ? JSON.parse(data.value) : data?.value;
    const rawProducts = rawValue?.products;
    if (!rawProducts || typeof rawProducts !== 'object') {
      return null;
    }

    const normalized: Record<string, ProductDefinition> = {};
    for (const [id, product] of Object.entries(rawProducts)) {
      if (isValidProductDefinition(product)) {
        normalized[id] = product;
      }
    }

    if (Object.keys(normalized).length === 0) {
      return null;
    }

    return normalized;
  } catch (error) {
    console.error('[products] Failed to fetch product catalog:', error);
    return null;
  }
}

async function getProductCatalog(): Promise<Record<string, ProductDefinition>> {
  const now = Date.now();
  if (cachedCatalog && now - lastCatalogFetch < CATALOG_CACHE_TTL_MS) {
    return cachedCatalog;
  }

  const fromConfig = await fetchCatalogFromConfig();
  cachedCatalog = fromConfig ?? DEFAULT_PRODUCT_CATALOG;
  lastCatalogFetch = now;
  return cachedCatalog;
}

export function invalidateProductCatalogCache() {
  cachedCatalog = null;
  lastCatalogFetch = 0;
}

export async function getProductById(productId: string): Promise<ProductDefinition | null> {
  const catalog = await getProductCatalog();
  return catalog[productId] ?? null;
}

export function getDefaultProduct(productId: ProductId): ProductDefinition {
  return DEFAULT_PRODUCT_CATALOG[productId];
}
