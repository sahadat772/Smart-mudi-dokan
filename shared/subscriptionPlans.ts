export type SubscriptionPlanId = "basic" | "pro";

export interface SubscriptionPlanConfig {
  displayName: string;
  description: string;
  limits: {
    shops: number | null;
    staff: number | null;
    products: number | null;
  };
  features: readonly string[];
}

const starterFeatures = [
  "১টি দোকান",
  "১ জন Owner + ২ জন Staff",
  "সর্বোচ্চ ৫০০টি Product",
  "POS Billing ও Receipt",
  "Product ও Stock Management",
  "Customer ও Due Management",
  "Basic Sales Reports",
  "Cloud Data Storage",
] as const;

/** Shared plan catalog used by both the browser UI and backend enforcement/API. */
export const SUBSCRIPTION_PLANS: Record<SubscriptionPlanId, SubscriptionPlanConfig> = {
  basic: {
    displayName: "Starter",
    description: "নতুন দোকানের জন্য",
    limits: { shops: 1, staff: 2, products: 500 },
    features: starterFeatures,
  },
  pro: {
    displayName: "Pro",
    description: "বড় বা ব্যস্ত দোকানের জন্য",
    // Pro had no enforced numeric caps in the existing app; null preserves that behavior.
    limits: { shops: 1, staff: null, products: null },
    features: starterFeatures,
  },
};

export function isSubscriptionPlanId(value: unknown): value is SubscriptionPlanId {
  return value === "basic" || value === "pro";
}

