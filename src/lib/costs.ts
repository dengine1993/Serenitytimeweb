export interface TokenPrice {
  inPer1k: number;   // $ per 1K input tokens
  outPer1k: number;  // $ per 1K output tokens
}

export const USD_RUB = Number(import.meta.env.VITE_USD_RUB ?? 82);

// Example defaults — make editable via ENV later if required
export const MODELS = {
  free:  { inPer1k: 0,    outPer1k: 0    },                     // local/free tier
  plus:  { inPer1k: 0.2,  outPer1k: 0.6  },                     // mid model (OpenRouter)
  premium:{ inPer1k: 0.5, outPer1k: 1.5  },                     // higher model
} satisfies Record<string, TokenPrice>;

export function usdToRub(usd: number) { 
  return usd * USD_RUB; 
}

export function estimateTextCostUSD(
  tier: keyof typeof MODELS,
  inputTokens: number,
  outputTokens: number
) {
  const m = MODELS[tier];
  return (inputTokens/1000)*m.inPer1k + (outputTokens/1000)*m.outPer1k;
}

export function estimateSessionCostRUB(
  tier: keyof typeof MODELS,
  inputTokens: number,
  outputTokens: number
): { textCost: number; total: number } {
  const textUSD = estimateTextCostUSD(tier, inputTokens, outputTokens);
  const textCost = usdToRub(textUSD);
  
  return {
    textCost,
    total: textCost
  };
}
