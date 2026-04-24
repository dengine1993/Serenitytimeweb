import { assertEquals } from "https://deno.land/std@0.224.0/testing/asserts.ts";
import { grantPremiumSubscription, amountsMatch } from "./index.ts";
import type { ProductDefinition } from "../_shared/products.ts";

const premiumProduct: ProductDefinition = {
  id: "premium_subscription_monthly",
  name: "Premium Monthly Subscription",
  description: "",
  amount: { value: 890, currency: "RUB" },
  paymentType: "subscription",
  entitlement: { kind: "subscription", plan: "premium", intervalMonths: 1 },
};

class SupabaseStub {
  subscription: { id: string; current_period_end: string } | null;
  referral: { inviter_user_id: string; inviter_reward_days: number } | null;
  inviterSub: { current_period_end: string } | null;
  updates: any[] = [];
  inserts: any[] = [];

  constructor(options: {
    subscription?: { id: string; current_period_end: string } | null;
    referral?: { inviter_user_id: string; inviter_reward_days: number } | null;
    inviterSub?: { current_period_end: string } | null;
  }) {
    this.subscription = options.subscription ?? null;
    this.referral = options.referral ?? null;
    this.inviterSub = options.inviterSub ?? null;
  }

  from(table: string) {
    if (table === "subscriptions") {
      return {
        select: () => ({
          eq: (_col: string, _val: string) => ({
            eq: (_col2: string, _val2: string) => ({
              maybeSingle: async () => ({ data: this.subscription }),
              single: async () => ({ data: this.inviterSub }),
            }),
          }),
        }),
        update: (payload: any) => ({
          eq: async () => {
            this.updates.push(payload);
            if (this.subscription) {
              this.subscription.current_period_end = payload.current_period_end;
            }
            return { data: null, error: null };
          },
        }),
        insert: async (payload: any) => {
          this.inserts.push(payload);
          this.subscription = {
            id: "new-sub",
            current_period_end: payload.current_period_end,
          };
          return { data: null, error: null };
        },
      };
    }

    if (table === "referrals_v2") {
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: this.referral }),
            single: async () => ({ data: this.referral }),
          }),
        }),
      };
    }

    return {
      select: () => ({
        eq: () => ({
          maybeSingle: async () => ({ data: null }),
        }),
      }),
      update: () => ({
        eq: async () => ({ data: null, error: null }),
      }),
      insert: async () => ({ data: null, error: null }),
    };
  }
}

Deno.test("grantPremiumSubscription creates subscription when none exists", async () => {
  const supabase = new SupabaseStub({ subscription: null });
  await grantPremiumSubscription(supabase as any, "user-1", 1);
  assertEquals(supabase.inserts.length, 1);
  assertEquals(supabase.updates.length, 0);
});

Deno.test("grantPremiumSubscription extends existing subscription", async () => {
  const currentEnd = new Date("2025-01-01T00:00:00.000Z");
  const supabase = new SupabaseStub({
    subscription: { id: "sub-1", current_period_end: currentEnd.toISOString() },
  });

  await grantPremiumSubscription(supabase as any, "user-1", 1);

  assertEquals(supabase.inserts.length, 0);
  assertEquals(supabase.updates.length, 1);
  const updatedDate = new Date(supabase.subscription!.current_period_end);
  assertEquals(updatedDate.getMonth(), currentEnd.getMonth() + 1);
});

Deno.test("amountsMatch detects mismatched metadata", () => {
  const result = amountsMatch(premiumProduct, { value: "100.00", currency: "RUB" });
  assertEquals(result, false);
});

